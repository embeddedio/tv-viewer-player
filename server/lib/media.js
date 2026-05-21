const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { sendToApp } = require('./bridge');
const { sanitizeFilename, getExtension, readRequestBody, sendJson, notFound } = require('./utils');
const config = require('./config');
const { DEFAULT_DURATION } = config;

const publicDir = path.join(__dirname, '..', 'public');
const indexHtmlPath = path.join(publicDir, 'index.html');
const logoPrefix = 'logo-';
const allowedCategories = ['logo', 'media'];
const allowedImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
const allowedVideoExtensions = ['.mp4', '.m4v', '.mov', '.avi', '.mkv', '.webm'];
const allowedAudioExtensions = ['.mp3', '.aac', '.wav', '.flac', '.ogg'];
const allowedMediaExtensions = [
  ...allowedImageExtensions,
  ...allowedVideoExtensions,
  ...allowedAudioExtensions,
];

const isAllowedLogoFile = (name) => allowedImageExtensions.includes(getExtension(name));
const isAllowedMediaFile = (name) => allowedMediaExtensions.includes(getExtension(name));

// ─── Metadata (db) ────────────────────────────────────────────────────────────

function loadMetadata() {
  try {
    const raw = fs.readFileSync(config.metadataPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return [];
}

function saveMetadata(meta) {
  try {
    fs.mkdirSync(path.dirname(config.metadataPath), { recursive: true });
    fs.writeFileSync(config.metadataPath, JSON.stringify(meta, null, 2), 'utf8');
  } catch (e) {
    console.error('[media] saveMetadata error', e);
  }
}

function addToMetadata(name, originalName, folder = null) {
  const meta = loadMetadata();
  if (!meta.some((m) => m.name === name)) {
    meta.push({ name, originalName: originalName || name, duration: DEFAULT_DURATION, folder: folder || null });
    saveMetadata(meta);
  }
}

function removeFromMetadata(name) {
  const meta = loadMetadata();
  const filtered = meta.filter((m) => m.name !== name);
  if (filtered.length !== meta.length) saveMetadata(filtered);
}

function syncMetadata(fileNames) {
  const fileSet = new Set(fileNames);
  const meta = loadMetadata();
  const seen = new Set();
  let changed = false;
  const cleaned = [];

  for (const entry of meta) {
    if (!entry || typeof entry.name !== 'string') { changed = true; continue; }
    if (!fileSet.has(entry.name)) { changed = true; continue; }
    if (seen.has(entry.name)) { changed = true; continue; }
    cleaned.push({
      name: entry.name,
      originalName: entry.originalName || entry.name,
      duration: Math.max(1, parseInt(entry.duration, 10) || DEFAULT_DURATION),
      folder: entry.folder || null,
    });
    seen.add(entry.name);
  }

  for (const name of fileNames) {
    if (!seen.has(name)) {
      cleaned.push({ name, originalName: name, duration: DEFAULT_DURATION, folder: null });
      seen.add(name);
      changed = true;
    }
  }

  if (changed) saveMetadata(cleaned);
  return cleaned;
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

const getCurrentLogoAsync = async () => {
  try {
    const files = fs.readdirSync(config.uploadsDir).filter((f) => f.startsWith(logoPrefix));
    if (!files.length) return null;
    const name = files[0];
    const stats = fs.statSync(path.join(config.uploadsDir, name));
    return { name, size: stats.size, url: `/uploads/${encodeURIComponent(name)}` };
  } catch (_) {
    return null;
  }
};

const removeCurrentLogoAsync = () => {
  try {
    const files = fs.readdirSync(config.uploadsDir).filter((f) => f.startsWith(logoPrefix));
    for (const f of files) {
      try { fs.unlinkSync(path.join(config.uploadsDir, f)); } catch (_) {}
    }
  } catch (_) {}
};

const saveLogoFileAsync = (file) => {
  const safeOriginal = sanitizeFilename(file.name);
  const targetName = `${logoPrefix}${Date.now()}-${safeOriginal}`;
  const buffer = Buffer.from(file.data, 'base64');
  removeCurrentLogoAsync();
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(config.uploadsDir, targetName), buffer);
  return targetName;
};

// ─── Files ────────────────────────────────────────────────────────────────────

const getExistingFileNames = () => {
  try {
    return fs.readdirSync(config.uploadsDir).filter((f) => {
      if (f.startsWith(logoPrefix)) return false;
      if (!isAllowedMediaFile(f)) return false;
      try { return fs.statSync(path.join(config.uploadsDir, f)).isFile(); } catch (_) { return false; }
    });
  } catch (_) {
    return [];
  }
};

const listFilesAsync = async () => {
  const fileNames = getExistingFileNames();
  const metadata = syncMetadata(fileNames);

  return metadata
    .map((entry) => {
      try {
        const stats = fs.statSync(path.join(config.uploadsDir, entry.name));
        const [category = 'media'] = entry.name.split('-');
        return {
          name: entry.name,
          originalName: entry.originalName || entry.name,
          category: allowedCategories.includes(category) ? category : 'media',
          size: stats.size,
          duration: entry.duration || DEFAULT_DURATION,
          folder: entry.folder || null,
        };
      } catch (_) { return null; }
    })
    .filter(Boolean);
};

const refreshContentAsync = async () => {
  const files = await listFilesAsync();
  const { db } = require('./config');
  db.content = files;
  sendToApp('display-content', { files: db.content });
};

// ─── Route handlers ───────────────────────────────────────────────────────────

const handleUpload = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body.toString('utf-8'));
    const category = allowedCategories.includes(payload.category) ? payload.category : 'media';
    const folder = (category === 'media' && typeof payload.folder === 'string') ? payload.folder : null;
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (!files.length) return sendJson(res, { message: 'Aucun fichier fourni' }, 400);

    if (category === 'logo') {
      const file = files[0];
      if (!file || !file.data) return sendJson(res, { message: 'Fichier logo invalide' }, 400);
      if (!isAllowedLogoFile(file.name)) return sendJson(res, { message: 'Format de logo non autorisé' }, 415);
      const targetName = saveLogoFileAsync(file);
      sendToApp('logo-updated', { url: `/uploads/${encodeURIComponent(targetName)}`, name: file.name });
      return sendJson(res, { success: true, logo: targetName });
    }

    fs.mkdirSync(config.uploadsDir, { recursive: true });
    const saved = [];
    for (const file of files) {
      if (!file || !file.data || !isAllowedMediaFile(file.name)) continue;
      const ext = getExtension(file.name);
      const uniqueName = `${category}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      fs.writeFileSync(path.join(config.uploadsDir, uniqueName), Buffer.from(file.data, 'base64'));
      addToMetadata(uniqueName, file.name, folder);
      saved.push({ name: uniqueName, originalName: file.name });
    }

    if (!saved.length) return sendJson(res, { message: 'Aucun fichier valide (audio, vidéo ou image) fourni' }, 400);
    await refreshContentAsync();
    return sendJson(res, { success: true, saved });
  } catch (error) {
    console.error('[media] handleUpload error', error);
    return sendJson(res, { message: "Impossible de traiter l'envoi." }, 500);
  }
};

const handleDelete = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const contentType = req.headers['content-type'] || '';
    let filename = '';
    if (contentType.includes('application/json')) {
      filename = JSON.parse(body.toString('utf-8')).filename;
    } else {
      filename = new URLSearchParams(body.toString('utf-8')).get('filename');
    }
    if (!filename) return sendJson(res, { message: 'Nom de fichier requis' }, 400);

    const target = path.join(config.uploadsDir, path.normalize(filename));
    if (!target.startsWith(config.uploadsDir)) return sendJson(res, { message: 'Fichier introuvable' }, 404);

    try { fs.unlinkSync(target); } catch (_) {}
    removeFromMetadata(filename);
    await refreshContentAsync();
    return sendJson(res, { success: true });
  } catch (error) {
    console.error('[media] handleDelete error', error);
    return sendJson(res, { message: 'Suppression impossible' }, 500);
  }
};

const handleLogoDelete = async (_req, res) => {
  removeCurrentLogoAsync();
  sendToApp('logo-deleted', {});
  return sendJson(res, { success: true });
};

const handleUpdateFiles = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body.toString('utf-8'));
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (!files.length) return sendJson(res, { message: 'Format invalide' }, 400);

    const existingNames = getExistingFileNames();
    const existingSet = new Set(existingNames);
    const currentMeta = loadMetadata();
    const metaMap = new Map(currentMeta.map((m) => [m.name, m]));

    const sanitized = [];
    for (const file of files) {
      if (!file || typeof file.name !== 'string' || !existingSet.has(file.name)) continue;
      const duration = Math.max(1, parseInt(file.duration, 10) || DEFAULT_DURATION);
      const originalName = file.originalName || metaMap.get(file.name)?.originalName || file.name;
      const folder = metaMap.get(file.name)?.folder || null;
      sanitized.push({ name: file.name, originalName, duration, folder });
    }

    if (!sanitized.length) return sendJson(res, { message: 'Aucun fichier valide fourni' }, 400);

    for (const name of existingNames) {
      if (!sanitized.find((e) => e.name === name)) {
        const originalName = metaMap.get(name)?.originalName || name;
        const folder = metaMap.get(name)?.folder || null;
        sanitized.push({ name, originalName, duration: metaMap.get(name)?.duration || DEFAULT_DURATION, folder });
      }
    }

    saveMetadata(sanitized);
    await refreshContentAsync();
    return sendJson(res, { success: true });
  } catch (error) {
    console.error('[media] handleUpdateFiles error', error);
    return sendJson(res, { message: 'Sauvegarde impossible' }, 500);
  }
};

const serveUpload = (res, relativePath) => {
  const safePath = path.normalize(relativePath).replace(/^([\.]{2}[/\\])+/, '');
  const filePath = path.join(config.uploadsDir, safePath);
  if (!filePath.startsWith(config.uploadsDir)) return notFound(res);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return notFound(res);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
};

// ─── Folders ──────────────────────────────────────────────────────────────────

function loadFolders() {
  try {
    const raw = fs.readFileSync(config.foldersPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((f) => typeof f === 'string');
  } catch (_) {}
  return [];
}

function saveFolders(list) {
  try {
    fs.mkdirSync(path.dirname(config.foldersPath), { recursive: true });
    fs.writeFileSync(config.foldersPath, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('[media] saveFolders error', e);
  }
}

const handleFoldersGet = (_req, res) => {
  sendJson(res, { folders: loadFolders() });
};

const handleFolderCreate = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const { name } = JSON.parse(body.toString('utf-8'));
    if (!name || typeof name !== 'string' || !name.trim()) return sendJson(res, { message: 'Nom requis' }, 400);
    const trimmed = name.trim();
    const folders = loadFolders();
    if (folders.includes(trimmed)) return sendJson(res, { message: 'Dossier déjà existant' }, 409);
    saveFolders([...folders, trimmed]);
    return sendJson(res, { success: true });
  } catch (e) {
    return sendJson(res, { message: 'Erreur création dossier' }, 500);
  }
};

const handleFolderDelete = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const { name } = JSON.parse(body.toString('utf-8'));
    if (!name) return sendJson(res, { message: 'Nom requis' }, 400);
    saveFolders(loadFolders().filter((f) => f !== name));
    const meta = loadMetadata();
    saveMetadata(meta.map((m) => (m.folder === name ? { ...m, folder: null } : m)));
    await refreshContentAsync();
    return sendJson(res, { success: true });
  } catch (e) {
    return sendJson(res, { message: 'Erreur suppression dossier' }, 500);
  }
};

const handleFolderRename = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const { oldName, newName } = JSON.parse(body.toString('utf-8'));
    if (!oldName || !newName || !newName.trim()) return sendJson(res, { message: 'Paramètres manquants' }, 400);
    const trimmed = newName.trim();
    const folders = loadFolders();
    if (folders.includes(trimmed) && trimmed !== oldName) return sendJson(res, { message: 'Nom déjà utilisé' }, 409);
    saveFolders(folders.map((f) => (f === oldName ? trimmed : f)));
    const meta = loadMetadata();
    saveMetadata(meta.map((m) => (m.folder === oldName ? { ...m, folder: trimmed } : m)));
    await refreshContentAsync();
    return sendJson(res, { success: true });
  } catch (e) {
    return sendJson(res, { message: 'Erreur renommage dossier' }, 500);
  }
};

const handleMoveFile = async (req, res) => {
  try {
    const body = await readRequestBody(req);
    const { filename, folder } = JSON.parse(body.toString('utf-8'));
    if (!filename) return sendJson(res, { message: 'filename requis' }, 400);
    const meta = loadMetadata();
    saveMetadata(meta.map((m) => (m.name === filename ? { ...m, folder: folder || null } : m)));
    await refreshContentAsync();
    return sendJson(res, { success: true });
  } catch (e) {
    return sendJson(res, { message: 'Erreur déplacement fichier' }, 500);
  }
};

const serveIndexHtml = (res) => {
  const { sendHtml } = require('./utils');
  fs.readFile(indexHtmlPath, 'utf8', (error, content) => {
    if (error) return sendJson(res, { message: 'Interface introuvable' }, 500);
    return sendHtml(res, content);
  });
};

module.exports = {
  handleUpload,
  handleDelete,
  handleLogoDelete,
  handleUpdateFiles,
  listFilesAsync,
  getCurrentLogoAsync,
  serveUpload,
  serveIndexHtml,
  refreshContentAsync,
  handleFoldersGet,
  handleFolderCreate,
  handleFolderDelete,
  handleFolderRename,
  handleMoveFile,
};
