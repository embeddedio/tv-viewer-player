const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readUInt16LE(buf, off) {
  return buf[off] | (buf[off + 1] << 8);
}

function readUInt32LE(buf, off) {
  return ((buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16)) >>> 0) + buf[off + 3] * 0x1000000;
}

// Extrait un buffer ZIP vers destDir via la Central Directory (tailles toujours fiables)
// Supporte méthodes 0 (stored) et 8 (deflate). Bloque le path traversal.
function extractZip(buffer, destDir) {
  // Cherche End of Central Directory : signature PK\x05\x06
  let eocdOffset = -1;
  const maxSearch = Math.min(buffer.length - 22, 65557);
  for (let i = buffer.length - 22; i >= buffer.length - 22 - maxSearch; i--) {
    if (i < 0) break;
    if (readUInt32LE(buffer, i) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error('Fichier ZIP invalide (EOCD introuvable)');

  const cdCount = readUInt16LE(buffer, eocdOffset + 10);
  const cdOffset = readUInt32LE(buffer, eocdOffset + 16);
  const resolvedDest = path.resolve(destDir);

  let offset = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (offset + 46 > buffer.length) break;
    if (readUInt32LE(buffer, offset) !== 0x02014b50) break; // PK\x01\x02

    const method = readUInt16LE(buffer, offset + 10);
    const compressedSize = readUInt32LE(buffer, offset + 20);
    const fileNameLen = readUInt16LE(buffer, offset + 28);
    const extraLen = readUInt16LE(buffer, offset + 30);
    const commentLen = readUInt16LE(buffer, offset + 32);
    const localHeaderOffset = readUInt32LE(buffer, offset + 42);
    const fileName = buffer.slice(offset + 46, offset + 46 + fileNameLen).toString('utf8');

    offset += 46 + fileNameLen + extraLen + commentLen;

    if (fileName.endsWith('/')) continue; // répertoire

    const destPath = path.resolve(resolvedDest, fileName);
    if (!destPath.startsWith(resolvedDest + path.sep) && destPath !== resolvedDest) continue; // path traversal

    // Lire tailles réelles depuis local header
    if (localHeaderOffset + 30 > buffer.length) continue;
    const localFileNameLen = readUInt16LE(buffer, localHeaderOffset + 26);
    const localExtraLen = readUInt16LE(buffer, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

    if (dataOffset + compressedSize > buffer.length) continue;

    let fileData;
    if (method === 0) {
      fileData = buffer.slice(dataOffset, dataOffset + compressedSize);
    } else if (method === 8) {
      fileData = zlib.inflateRawSync(buffer.slice(dataOffset, dataOffset + compressedSize));
    } else {
      throw new Error(`Méthode de compression ${method} non supportée`);
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, fileData);
  }
}

function setPermissionsRecursive(dir) {
  try { fs.chmodSync(dir, 0o777); } catch (_) {}
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) setPermissionsRecursive(p);
      else try { fs.chmodSync(p, 0o666); } catch (_) {}
    }
  } catch (_) {}
}

// Valide que le type de widget est sûr (alphanumérique + tirets, pas de traversal)
function validateType(type) {
  return typeof type === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(type);
}

/**
 * Installe un widget depuis un ZIP encodé en base64.
 * Écrase l'ancien widget du même type si existant.
 * @returns {object} manifest du widget installé
 */
function installWidget(base64zip, widgetsStoragePath) {
  if (!widgetsStoragePath) throw new Error('Chemin widgets non initialisé');

  const zipBuffer = Buffer.from(base64zip, 'base64');
  if (zipBuffer.length < 22) throw new Error('Fichier ZIP invalide');

  const tmpDir = path.join(widgetsStoragePath, `_tmp_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    extractZip(zipBuffer, tmpDir);

    // Cherche manifest.json à la racine, ou dans un unique sous-dossier (ZIP avec dossier englobant)
    let widgetRoot = tmpDir;
    let manifestPath = path.join(tmpDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      const entries = fs.readdirSync(tmpDir).filter(e => {
        try { return fs.statSync(path.join(tmpDir, e)).isDirectory(); } catch { return false; }
      });
      if (entries.length === 1) {
        const sub = path.join(tmpDir, entries[0]);
        const subManifest = path.join(sub, 'manifest.json');
        if (fs.existsSync(subManifest)) { widgetRoot = sub; manifestPath = subManifest; }
      }
    }
    if (!fs.existsSync(manifestPath)) throw new Error('manifest.json manquant dans le ZIP');

    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
    catch { throw new Error('manifest.json invalide (JSON malformé)'); }

    if (!manifest.type) throw new Error('manifest.json : champ "type" manquant');
    if (!manifest.label) throw new Error('manifest.json : champ "label" manquant');
    if (!validateType(manifest.type)) throw new Error('manifest.json : "type" doit être alphanumérique (tirets autorisés)');

    const destDir = path.join(widgetsStoragePath, manifest.type);
    if (!path.resolve(destDir).startsWith(path.resolve(widgetsStoragePath) + path.sep)) {
      throw new Error('Nom de widget invalide');
    }

    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    fs.renameSync(widgetRoot, destDir);
    // Nettoyer le tmpDir parent si le widget était dans un sous-dossier
    if (widgetRoot !== tmpDir) try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    setPermissionsRecursive(destDir);

    return manifest;
  } catch (err) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    throw err;
  }
}

module.exports = { installWidget };
