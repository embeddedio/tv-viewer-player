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
    if (readUInt32LE(buffer, offset) !== 0x02014b50) break;

    const method = readUInt16LE(buffer, offset + 10);
    const compressedSize = readUInt32LE(buffer, offset + 20);
    const fileNameLen = readUInt16LE(buffer, offset + 28);
    const extraLen = readUInt16LE(buffer, offset + 30);
    const commentLen = readUInt16LE(buffer, offset + 32);
    const localHeaderOffset = readUInt32LE(buffer, offset + 42);
    const fileName = buffer.slice(offset + 46, offset + 46 + fileNameLen).toString('utf8');

    offset += 46 + fileNameLen + extraLen + commentLen;

    if (fileName.endsWith('/')) continue;
    // Ignore les dossiers macOS / fichiers cachés (__MACOSX, .DS_Store)
    if (fileName.startsWith('__MACOSX/') || fileName.split('/').some((p) => p === '.DS_Store')) continue;

    const destPath = path.resolve(resolvedDest, fileName);
    if (!destPath.startsWith(resolvedDest + path.sep) && destPath !== resolvedDest) continue;

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

function validateType(type) {
  return typeof type === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(type);
}

// Trouve tous les dossiers "racine de widget" (qui contiennent directement un manifest.json).
// Ne descend pas dans un dossier widget une fois trouvé.
function findWidgetRoots(dir, results) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  if (entries.some((e) => e.isFile() && e.name === 'manifest.json')) {
    results.push(dir);
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) findWidgetRoots(path.join(dir, e.name), results);
  }
}

// Installe un widget depuis son dossier extrait → widgets/{type}. Retourne le manifest.
function installFromDir(widgetRoot, widgetsStoragePath) {
  const manifestPath = path.join(widgetRoot, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch { throw new Error('manifest.json invalide (JSON malformé)'); }

  if (!manifest.type) throw new Error('manifest.json : champ "type" manquant');
  if (!manifest.label) throw new Error('manifest.json : champ "label" manquant');
  if (!validateType(manifest.type)) throw new Error(`manifest.json : "type" invalide (${manifest.type})`);

  const destDir = path.join(widgetsStoragePath, manifest.type);
  if (!path.resolve(destDir).startsWith(path.resolve(widgetsStoragePath) + path.sep)) {
    throw new Error('Nom de widget invalide');
  }

  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.renameSync(widgetRoot, destDir);
  setPermissionsRecursive(destDir);
  return manifest;
}

/**
 * Installe un OU plusieurs widgets depuis un ZIP encodé en base64.
 * - ZIP d'un seul widget (manifest.json à la racine ou dans 1 sous-dossier) → installe 1 widget.
 * - ZIP groupé (plusieurs dossiers, chacun avec son manifest.json) → installe tous les widgets.
 * Écrase les widgets existants de même type.
 * @returns {object[]} liste des manifests installés
 */
function installWidgets(base64zip, widgetsStoragePath) {
  if (!widgetsStoragePath) throw new Error('Chemin widgets non initialisé');

  const zipBuffer = Buffer.from(base64zip, 'base64');
  if (zipBuffer.length < 22) throw new Error('Fichier ZIP invalide');

  const tmpDir = path.join(widgetsStoragePath, `_tmp_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    extractZip(zipBuffer, tmpDir);

    const roots = [];
    findWidgetRoots(tmpDir, roots);
    if (!roots.length) throw new Error('Aucun manifest.json trouvé dans le ZIP');

    const installed = [];
    for (const root of roots) {
      installed.push(installFromDir(root, widgetsStoragePath));
    }
    return installed;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// Compat : installe un seul widget et renvoie son manifest (1er trouvé).
function installWidget(base64zip, widgetsStoragePath) {
  const installed = installWidgets(base64zip, widgetsStoragePath);
  return installed[0];
}

module.exports = { installWidget, installWidgets };
