const http = require('http');
const fs = require('fs');
const path = require('path');

let captureResolve = null;

// Chemin vers le dossier widgets dans le stockage externe (Documents/tv-viewer/widgets/)
// main.js reçoit storage-path et set TV_STORAGE_PATH avant de require('./server')
// → on lit l'env var directement, le listener bridge ne reçoit jamais ce message
let widgetsStoragePath = process.env.TV_STORAGE_PATH
  ? path.join(process.env.TV_STORAGE_PATH, 'widgets')
  : null;

// Handlers API des widgets chargés dynamiquement depuis leur api.js
const widgetApiHandlers = {};

// Bridge RN→Node.js : résultats de capture uniquement
// (storage-path est consommé par main.js avant que ce listener soit attaché)
try {
  require('rn-bridge').channel.on('message', (msg) => {
    try {
      const p = JSON.parse(msg);
      if (p.type === 'capture-result' && captureResolve) {
        captureResolve(p.captureError ? { captureError: p.captureError } : { image: p.image, rotation: p.rotation });
        captureResolve = null;
      }
    } catch {}
  });
} catch {}

// Charge dynamiquement les handlers api.js de chaque widget depuis le stockage externe
// widgetApiHandlers[widgetType] = module complet (exports.getData et/ou exports.handleRequest)
function loadWidgetApiRoutes() {
  if (!widgetsStoragePath) return;
  try {
    const entries = fs.readdirSync(widgetsStoragePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(widgetsStoragePath, entry.name, 'manifest.json');
      const apiPath = path.join(widgetsStoragePath, entry.name, 'api.js');
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!manifest.type) continue;
        if (fs.existsSync(apiPath)) {
          delete require.cache[require.resolve(apiPath)];
          const mod = require(apiPath);
          if (typeof mod.getData === 'function' || typeof mod.handleRequest === 'function') {
            widgetApiHandlers[manifest.type] = mod;
            console.log('[Server] widget API loaded:', manifest.type);
          }
        }
      } catch (_) { /* manifest absent ou api.js invalide */ }
    }
  } catch (_) {}
}

// Chargement initial dès le démarrage (TV_STORAGE_PATH déjà défini par main.js)
if (widgetsStoragePath) {
  console.log('[Server] widgets storage path:', widgetsStoragePath);
  loadWidgetApiRoutes();
}

// Liste des widgets disponibles (scanne le stockage externe)
function getWidgetsList() {
  if (!widgetsStoragePath) return [];
  try {
    return fs.readdirSync(widgetsStoragePath, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .reduce((acc, entry) => {
        try {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(widgetsStoragePath, entry.name, 'manifest.json'), 'utf8')
          );
          if (manifest && manifest.type) acc.push(manifest);
        } catch (_) {}
        return acc;
      }, []);
  } catch (_) { return []; }
}

// --- Lib modules ---
const { sendToApp } = require('./lib/bridge');
const {
  sendJson, notFound, readRequestBody, getMimeType,
  parseCookies, setCookieHeader, clearCookieHeader,
} = require('./lib/utils');
const {
  initDB, getAppConfigAsync, writeConfigAsync, broadcastDisplaySettings,
  getContent, getDevises, getRotation, getEcart,
  setContent, setDevises, setRotation, setEcart,
  migrateToSequences, getDefaultSequenceId,
} = require('./lib/config');
const {
  handleUpload, handleDelete, handleLogoDelete, handleUpdateFiles,
  listFilesAsync, getCurrentLogoAsync, serveUpload, serveIndexHtml, refreshContentAsync,
  handleFoldersGet, handleFolderCreate, handleFolderDelete, handleFolderRename, handleMoveFile,
} = require('./lib/media');
const { initAuth, login, logout, changePassword, requireAuth, getAuthStatus } = require('./lib/auth');
const { LAYOUT_TEMPLATES } = require('./lib/layouts');
const sequences = require('./lib/sequences');
const { resolveActiveDisplay } = require('./lib/scheduler');
const os = require('os');

// --- CPU sampler via /proc/stat (works on Android) ---
let cpuUsage = 0;
let cpuCount = 0;
try {
  const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
  cpuCount = (cpuinfo.match(/^processor\s*:/gm) || []).length;
} catch (_) {}
if (!cpuCount) cpuCount = os.cpus().length || 1;
let prevCpuTotal = 0;
let prevCpuIdle = 0;

const parseProcStat = () => {
  try {
    const raw = fs.readFileSync('/proc/stat', 'utf8');
    const line = raw.split('\n').find(l => l.startsWith('cpu '));
    if (!line) return null;
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = (parts[3] || 0) + (parts[4] || 0);
    const total = parts.reduce((s, v) => s + v, 0);
    return { total, idle };
  } catch (_) { return null; }
};

const sampleCpu = () => {
  const proc = parseProcStat();
  if (proc && proc.total > prevCpuTotal) {
    const totalDelta = proc.total - prevCpuTotal;
    const idleDelta = proc.idle - prevCpuIdle;
    cpuUsage = Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
    prevCpuTotal = proc.total;
    prevCpuIdle = proc.idle;
    return;
  }
  const loadAvg = os.loadavg()[0];
  if (loadAvg > 0) {
    cpuUsage = Math.min(100, Math.round((loadAvg / cpuCount) * 100));
    return;
  }
  const snap = os.cpus();
  let totalD = 0;
  let idleD = 0;
  for (const cpu of snap) {
    const t = cpu.times;
    totalD += t.user + t.nice + t.sys + t.idle + t.irq;
    idleD += t.idle;
  }
  cpuUsage = totalD > 0 ? Math.round(((totalD - idleD) / totalD) * 100) : 0;
};

const initSnap = parseProcStat();
if (initSnap) { prevCpuTotal = initSnap.total; prevCpuIdle = initSnap.idle; }
setInterval(sampleCpu, 3000);

// --- Memory via /proc/meminfo ---
const getMemoryInfo = () => {
  try {
    const raw = fs.readFileSync('/proc/meminfo', 'utf8');
    const get = (key) => {
      const m = raw.match(new RegExp(key + ':\\s+(\\d+)'));
      return m ? parseInt(m[1]) * 1024 : 0;
    };
    const total = get('MemTotal');
    const free = get('MemFree');
    const buffers = get('Buffers');
    const cached = get('Cached');
    const available = get('MemAvailable') || (free + buffers + cached);
    return { total, used: total - available, free: available };
  } catch (_) {
    const total = os.totalmem();
    const free = os.freemem();
    return { total, used: total - free, free };
  }
};

const getDiskInfo = (dirPath) => {
  try {
    const { execSync } = require('child_process');
    const df = execSync(`df "${dirPath}" 2>/dev/null`).toString();
    const lines = df.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      const total = (parseInt(parts[1]) || 0) * 1024;
      const free = (parseInt(parts[3]) || 0) * 1024;
      if (total > 0) return { total, free };
    }
  } catch (_) {}
  return { total: 0, free: 0 };
};

const getSystemStats = () => {
  const { uploadsDir } = require('./lib/config');
  const memory = getMemoryInfo();
  let storageUsed = 0;
  let fileCount = 0;
  try {
    if (fs.existsSync(uploadsDir)) {
      const entries = fs.readdirSync(uploadsDir);
      for (const entry of entries) {
        try {
          const stat = fs.statSync(path.join(uploadsDir, entry));
          if (stat.isFile()) { storageUsed += stat.size; fileCount++; }
        } catch (_) {}
      }
    }
  } catch (_) {}
  const disk = getDiskInfo(uploadsDir);
  return {
    memory,
    cpu: { count: cpuCount, usage: cpuUsage },
    storage: { used: storageUsed, fileCount },
    disk,
    uptime: os.uptime(),
    storagePath: widgetsStoragePath || '(en attente)',
  };
};

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // --- Ressources statiques (pas d'auth) ---

    if (req.method === 'GET' && pathname.startsWith('/assets/')) {
      const publicDir = path.join(__dirname, 'public');
      const safePath = path.join(publicDir, pathname);
      if (!safePath.startsWith(publicDir)) return notFound(res);
      return fs.access(safePath, fs.constants.F_OK, (err) => {
        if (err) return notFound(res);
        res.writeHead(200, {
          'Content-Type': getMimeType(safePath),
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        fs.createReadStream(safePath).pipe(res);
      });
    }

    if (req.method === 'GET' && /^\/(logo|favicon)\.(png|ico|svg|jpg|gif)$/.test(pathname)) {
      const publicDir = path.join(__dirname, 'public');
      const safePath = path.join(publicDir, pathname);
      if (!safePath.startsWith(publicDir)) return notFound(res);
      return fs.access(safePath, fs.constants.F_OK, (err) => {
        if (err) return notFound(res);
        res.writeHead(200, { 'Content-Type': getMimeType(safePath), 'Cache-Control': 'public, max-age=3600' });
        fs.createReadStream(safePath).pipe(res);
      });
    }

    if (req.method === 'GET' && pathname.startsWith('/widget-schemas/')) {
      const publicDir = path.join(__dirname, 'public');
      const safePath = path.join(publicDir, pathname);
      if (!safePath.startsWith(publicDir)) return notFound(res);
      return fs.access(safePath, fs.constants.F_OK, (err) => {
        if (err) return notFound(res);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(safePath).pipe(res);
      });
    }

    // Liste des widgets (depuis stockage externe)
    if (req.method === 'GET' && pathname === '/api/widgets') {
      loadWidgetApiRoutes();
      return sendJson(res, getWidgetsList());
    }

    // Fichiers statiques d'un widget (ui.json, settings.html, assets...)
    // Servis depuis le stockage externe (Documents/tv-viewer/widgets/)
    if (req.method === 'GET' && pathname.startsWith('/widgets/') && widgetsStoragePath) {
      const relative = pathname.replace(/^\/widgets\//, '');
      const safePath = path.join(widgetsStoragePath, relative);
      if (!safePath.startsWith(widgetsStoragePath)) return notFound(res);
      return fs.stat(safePath, (err, stats) => {
        if (err) return notFound(res);
        const finalPath = stats.isDirectory() ? path.join(safePath, 'index.html') : safePath;
        return fs.access(finalPath, fs.constants.F_OK, (accessErr) => {
          if (accessErr) return notFound(res);
          res.writeHead(200, { 'Content-Type': getMimeType(finalPath), 'Cache-Control': 'no-store' });
          fs.createReadStream(finalPath).pipe(res);
        });
      });
    }

    if (req.method === 'GET' && pathname === '/') {
      return serveIndexHtml(res);
    }

    if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
      const relative = pathname.replace('/uploads/', '');
      return serveUpload(res, relative);
    }

    if (req.method === 'GET' && pathname === '/auth/status') {
      return sendJson(res, getAuthStatus(req));
    }

    if (req.method === 'POST' && pathname === '/auth/login') {
      const body = await readRequestBody(req);
      try {
        const { password } = JSON.parse(body.toString('utf-8'));
        if (!password) return sendJson(res, { success: false, message: 'Mot de passe requis' }, 400);
        const result = await login(password);
        if (result.success) {
          setCookieHeader(res, 'mc_session', result.token, { maxAge: 86400 });
        }
        return sendJson(res, result);
      } catch (e) {
        return sendJson(res, { success: false, message: 'Requête invalide' }, 400);
      }
    }

    if (req.method === 'POST' && pathname === '/auth/logout') {
      const cookies = parseCookies(req);
      const token = cookies['mc_session'];
      if (token) logout(token);
      clearCookieHeader(res, 'mc_session');
      return sendJson(res, { success: true });
    }

    // --- Routes app (sans auth admin) ---

    if (req.method === 'GET' && pathname === '/content') {
      return sendJson(res, { files: getContent() });
    }
    if (req.method === 'GET' && pathname === '/devises') {
      return sendJson(res, { items: getDevises() });
    }
    if (req.method === 'GET' && pathname === '/rotation') {
      return sendJson(res, { orientation: getRotation() });
    }
    if (req.method === 'GET' && pathname === '/ecart') {
      return sendJson(res, { itemGap: getEcart() });
    }
    if (req.method === 'GET' && pathname === '/settings') {
      const config = await getAppConfigAsync();
      return sendJson(res, config);
    }

    if (req.method === 'GET' && pathname === '/api/active-sequence') {
      const defaultSeqId = getDefaultSequenceId();
      const display = resolveActiveDisplay(defaultSeqId);
      return sendJson(res, display);
    }

    if (req.method === 'GET' && pathname === '/api/active-display') {
      const defaultSeqId = getDefaultSequenceId();
      const display = resolveActiveDisplay(defaultSeqId);
      return sendJson(res, display);
    }

    if (req.method === 'GET' && pathname === '/api/app/sequences') {
      const allSequences = sequences.getAll();
      let timezone = 'UTC';
      try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) {}
      const version = allSequences.reduce((max, seq) => {
        const updatedAt = Number(seq?.updatedAt) || 0;
        return Math.max(max, updatedAt);
      }, 0);
      return sendJson(res, { serverTime: Date.now(), timezone, version, sequences: allSequences });
    }

    if (req.method === 'GET' && pathname === '/api/system-stats') {
      return sendJson(res, getSystemStats());
    }

    if (req.method === 'GET' && pathname === '/api/network-info') {
      const nets = os.networkInterfaces();
      const results = [];
      for (const [name, addrs] of Object.entries(nets)) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            const lname = name.toLowerCase();
            let type = 'Reseau';
            if (lname.includes('wlan') || lname.includes('wifi') || lname.includes('wi-fi')) type = 'WiFi';
            else if (lname.includes('eth') || lname.includes('enp') || lname.includes('eno')) type = 'Ethernet';
            results.push({ type, ip: addr.address, iface: name });
          }
        }
      }
      return sendJson(res, results);
    }

    if (req.method === 'GET' && pathname === '/api/layouts') {
      return sendJson(res, LAYOUT_TEMPLATES);
    }

    // --- Installation / suppression widgets (admin) ---

    if (req.method === 'POST' && pathname === '/api/widgets/install') {
      if (!requireAuth(req)) return sendJson(res, { message: 'Non authentifié' }, 401);
      if (!widgetsStoragePath) return sendJson(res, { message: 'Stockage widgets non initialisé' }, 503);
      try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body.toString('utf-8'));
        if (!payload.name || !payload.data) return sendJson(res, { message: 'Paramètres manquants (name, data)' }, 400);
        const { installWidget } = require('./lib/widget-install');
        const manifest = installWidget(payload.data, widgetsStoragePath);
        loadWidgetApiRoutes();
        sendToApp('widget-update', { widgetType: manifest.type, scope: 'all' });
        return sendJson(res, { success: true, widget: manifest });
      } catch (e) {
        return sendJson(res, { message: e.message || 'Erreur installation' }, 422);
      }
    }

    if (req.method === 'DELETE' && pathname.match(/^\/api\/widgets\/[^\/]+$/)) {
      if (!requireAuth(req)) return sendJson(res, { message: 'Non authentifié' }, 401);
      if (!widgetsStoragePath) return sendJson(res, { message: 'Stockage widgets non initialisé' }, 503);
      const widgetType = pathname.split('/')[3];
      const widgetDir = path.join(widgetsStoragePath, widgetType);
      if (!fs.existsSync(widgetDir)) return sendJson(res, { message: 'Widget non trouvé' }, 404);
      try {
        fs.rmSync(widgetDir, { recursive: true, force: true });
        delete widgetApiHandlers[widgetType];
        sendToApp('widget-update', { widgetType, scope: 'deleted' });
        return sendJson(res, { success: true });
      } catch (e) {
        return sendJson(res, { message: e.message || 'Erreur suppression' }, 500);
      }
    }

    // Routes API dynamiques des widgets (chargées depuis api.js de chaque widget)
    // Les routes /style sont gérées avant ce bloc — elles n'arrivent pas ici
    if (pathname.startsWith('/api/widgets/') && !pathname.match(/^\/api\/widgets\/[^\/]+\/style$/)) {
      const widgetType = pathname.split('/')[3];
      const mod = widgetApiHandlers[widgetType];
      if (!mod) return notFound(res);
      if (typeof mod.handleRequest === 'function') {
        return mod.handleRequest(req.method, pathname, req, res, sendJson);
      }
      if (req.method === 'GET' && typeof mod.getData === 'function') {
        return mod.getData(req, res, sendJson);
      }
      return notFound(res);
    }

    // --- Routes protégées (admin) ---

    if (!requireAuth(req)) {
      const appRoutes = ['/content', '/devises', '/rotation', '/ecart'];
      if (req.method === 'POST' && appRoutes.includes(pathname)) {
        // App-facing setters sans auth
      } else if (req.method === 'GET' && (pathname === '/files' || pathname === '/logo/info')) {
        // lecture seule autorisée
      } else if (req.method === 'GET' && pathname.match(/^\/api\/widgets\/[^\/]+\/style$/)) {
        // Style widget public — lu par le WebView du widget (pas de cookie de session)
      } else {
        return sendJson(res, { message: 'Non authentifié' }, 401);
      }
    }

    // --- Gestion fichiers ---

    if (req.method === 'GET' && pathname === '/files') {
      const files = await listFilesAsync();
      return sendJson(res, { files });
    }

    if (req.method === 'GET' && pathname === '/logo/info') {
      const logo = await getCurrentLogoAsync();
      return sendJson(res, { logo });
    }

    if (req.method === 'POST' && pathname === '/upload') {
      return handleUpload(req, res);
    }

    if (req.method === 'POST' && pathname === '/delete') {
      return handleDelete(req, res);
    }

    if (req.method === 'POST' && pathname === '/files/update') {
      return handleUpdateFiles(req, res);
    }

    if (req.method === 'GET' && pathname === '/folders') {
      return handleFoldersGet(req, res);
    }

    if (req.method === 'POST' && pathname === '/folders/create') {
      return handleFolderCreate(req, res);
    }

    if (req.method === 'POST' && pathname === '/folders/delete') {
      return handleFolderDelete(req, res);
    }

    if (req.method === 'POST' && pathname === '/folders/rename') {
      return handleFolderRename(req, res);
    }

    if (req.method === 'POST' && pathname === '/files/move') {
      return handleMoveFile(req, res);
    }

    // --- Setters app ---

    if (req.method === 'POST' && pathname === '/content') {
      const body = await readRequestBody(req);
      try {
        const payload = JSON.parse(body.toString('utf-8')) || {};
        if (!Array.isArray(payload.files)) return sendJson(res, { message: 'Paramètre invalide' }, 400);
        await setContent(payload.files);
        return sendJson(res, { success: true });
      } catch (e) {
        return sendJson(res, { message: 'Paramètre invalide' }, 400);
      }
    }

    if (req.method === 'POST' && pathname === '/devises') {
      const body = await readRequestBody(req);
      try {
        const payload = JSON.parse(body.toString('utf-8')) || {};
        if (!Array.isArray(payload.items)) return sendJson(res, { message: 'Paramètre invalide' }, 400);
        await setDevises(payload.items);
        return sendJson(res, { success: true });
      } catch (e) {
        return sendJson(res, { message: 'Paramètre invalide' }, 400);
      }
    }

    if (req.method === 'POST' && pathname === '/rotation') {
      const body = await readRequestBody(req);
      try {
        const payload = JSON.parse(body.toString('utf-8')) || {};
        if (typeof payload.orientation !== 'string') return sendJson(res, { message: 'Paramètre invalide' }, 400);
        const value = await setRotation(payload.orientation);
        return sendJson(res, { success: true, orientation: value });
      } catch (e) {
        return sendJson(res, { message: 'Paramètre invalide' }, 400);
      }
    }

    if (req.method === 'POST' && pathname === '/ecart') {
      const body = await readRequestBody(req);
      try {
        const payload = JSON.parse(body.toString('utf-8')) || {};
        if (payload.itemGap === undefined) return sendJson(res, { message: 'Paramètre invalide' }, 400);
        const value = await setEcart(payload.itemGap);
        return sendJson(res, { success: true, itemGap: value });
      } catch (e) {
        return sendJson(res, { message: 'Paramètre invalide' }, 400);
      }
    }

    // --- Settings ---

    if (req.method === 'POST' && pathname === '/settings') {
      const body = await readRequestBody(req);
      try {
        const payload = JSON.parse(body.toString('utf-8')) || {};
        const updates = {};
        if (Object.prototype.hasOwnProperty.call(payload, 'orientation')) {
          updates.orientation = payload.orientation;
        }
        if (payload.ticker && typeof payload.ticker === 'object') {
          const t = payload.ticker;
          const tickerUpdate = {};
          if (Object.prototype.hasOwnProperty.call(t, 'heightPercent')) tickerUpdate.heightPercent = t.heightPercent;
          if (Object.prototype.hasOwnProperty.call(t, 'scale')) tickerUpdate.scale = t.scale;
          if (Object.prototype.hasOwnProperty.call(t, 'speed')) tickerUpdate.speed = t.speed;
          if (Object.prototype.hasOwnProperty.call(t, 'itemGap')) tickerUpdate.itemGap = t.itemGap;
          if (Object.prototype.hasOwnProperty.call(t, 'items')) tickerUpdate.items = t.items;
          if (Object.keys(tickerUpdate).length > 0) updates.ticker = tickerUpdate;
        }
        if (Object.keys(updates).length === 0) {
          return sendJson(res, { message: 'Paramètre invalide' }, 400);
        }
        const config = await writeConfigAsync(updates);
        if (Object.prototype.hasOwnProperty.call(updates, 'orientation')) {
          sendToApp('display-rotation', { orientation: config.orientation });
        }
        if (updates.ticker) {
          if (Object.prototype.hasOwnProperty.call(updates.ticker, 'itemGap')) {
            sendToApp('display-ecart', { itemGap: config.ticker.itemGap });
          }
          if (Object.prototype.hasOwnProperty.call(updates.ticker, 'items') && config.ticker.items?.length) {
            sendToApp('display-devises', { items: config.ticker.items });
          }
          if (Object.prototype.hasOwnProperty.call(updates.ticker, 'heightPercent') ||
              Object.prototype.hasOwnProperty.call(updates.ticker, 'scale') ||
              Object.prototype.hasOwnProperty.call(updates.ticker, 'speed') ||
              Object.prototype.hasOwnProperty.call(updates.ticker, 'itemGap')) {
            sendToApp('display-settings', { ticker: {
              heightPercent: config.ticker.heightPercent,
              scale: config.ticker.scale,
              speed: config.ticker.speed,
              itemGap: config.ticker.itemGap
            } });
          }
        }
        return sendJson(res, { success: true, ...config });
      } catch (error) {
        console.error('Settings update failed', error);
        return sendJson(res, { message: 'Paramètre invalide' }, 400);
      }
    }

    // --- Style générique des widgets ---
    // Stocke les styles de chaque widget dans la config app (widgetStyles[type])
    // et envoie un message bridge pour notifier React Native

    if (req.method === 'GET' && pathname.match(/^\/api\/widgets\/([^\/]+)\/style$/)) {
      const widgetType = pathname.split('/')[3];
      const cfg = await getAppConfigAsync();
      return sendJson(res, cfg.widgetStyles?.[widgetType] || {});
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/widgets\/([^\/]+)\/style$/)) {
      if (!requireAuth(req)) return sendJson(res, { message: 'Non autorise' }, 401);
      const widgetType = pathname.split('/')[3];
      const body = await readRequestBody(req);
      const style = JSON.parse(body);
      const cfg = await getAppConfigAsync();
      await writeConfigAsync({ widgetStyles: { ...(cfg.widgetStyles || {}), [widgetType]: style } });
      sendToApp('widget-update', { widgetType, scope: 'config' });
      return sendJson(res, { success: true, style });
    }

    // --- Logo ---

    if (req.method === 'POST' && pathname === '/logo/delete') {
      return handleLogoDelete(req, res);
    }

    // --- TV Schedule (HDMI-CEC) ---

    if (req.method === 'GET' && pathname === '/api/tv-schedule') {
      return sendJson(res, readTvSchedule());
    }

    if (req.method === 'POST' && pathname === '/api/tv-schedule') {
      const body = await readRequestBody(req);
      try {
        const payload = JSON.parse(body.toString('utf-8'));
        const schedule = {
          enabled: !!payload.enabled,
          startTime: String(payload.startTime || '08:00'),
          stopTime: String(payload.stopTime || '22:00'),
          days: Array.isArray(payload.days) ? payload.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [1, 2, 3, 4, 5],
        };
        writeTvSchedule(schedule);
        sendToApp('tv-schedule-updated', { schedule });
        return sendJson(res, { success: true, schedule });
      } catch (e) {
        return sendJson(res, { success: false, message: 'Requete invalide' }, 400);
      }
    }

    // --- Mot de passe ---

    if (req.method === 'POST' && pathname === '/auth/change-password') {
      const body = await readRequestBody(req);
      try {
        const { currentPassword, newPassword } = JSON.parse(body.toString('utf-8'));
        const result = await changePassword(currentPassword, newPassword);
        return sendJson(res, result, result.success ? 200 : 400);
      } catch (e) {
        return sendJson(res, { success: false, message: 'Requête invalide' }, 400);
      }
    }

    // --- Séquences CRUD ---

    if (req.method === 'GET' && pathname === '/api/sequences') {
      return sendJson(res, sequences.getAll());
    }

    if (req.method === 'GET' && pathname.startsWith('/api/sequences/')) {
      const id = pathname.replace('/api/sequences/', '');
      const seq = sequences.getById(id);
      if (!seq) return sendJson(res, { message: 'Séquence introuvable' }, 404);
      return sendJson(res, seq);
    }

    if (req.method === 'POST' && pathname === '/api/sequences') {
      const body = await readRequestBody(req);
      try {
        const input = JSON.parse(body.toString('utf-8'));
        const seq = await sequences.create(input);
        return sendJson(res, seq, 201);
      } catch (e) {
        return sendJson(res, { message: 'Données invalides', error: e.message }, 400);
      }
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/sequences/')) {
      const id = pathname.replace('/api/sequences/', '');
      const body = await readRequestBody(req);
      try {
        const input = JSON.parse(body.toString('utf-8'));
        const seq = await sequences.update(id, input);
        if (!seq) return sendJson(res, { message: 'Séquence introuvable' }, 404);
        return sendJson(res, seq);
      } catch (e) {
        return sendJson(res, { message: 'Données invalides', error: e.message }, 400);
      }
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/sequences/')) {
      const id = pathname.replace('/api/sequences/', '');
      const deleted = await sequences.remove(id);
      if (!deleted) return sendJson(res, { message: 'Séquence introuvable' }, 404);
      return sendJson(res, { success: true });
    }

    // --- Live Preview ---

    if (req.method === 'POST' && pathname === '/api/preview/result') {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body);
      if (captureResolve) { captureResolve(parsed); captureResolve = null; }
      return sendJson(res, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/preview/sequence') {
      if (!requireAuth(req)) return sendJson(res, { message: 'Non autorise' }, 401);
      const body = await readRequestBody(req);
      const { sequenceId } = JSON.parse(body);
      const seq = sequences.getById(sequenceId);
      if (!seq) return sendJson(res, { error: 'Séquence introuvable' }, 404);
      const display = {
        layoutId: seq.layoutId || 'fullscreen',
        customLayout: seq.customLayout || null,
        zones: seq.zones || { zone1: { type: 'playlist', items: [] } },
      };
      if (captureResolve) { captureResolve = null; }
      sendToApp('preview-sequence', { display });
      try {
        const result = await Promise.race([
          new Promise(resolve => { captureResolve = resolve; }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
        ]);
        if (result.captureError) return sendJson(res, { error: `Erreur capture : ${result.captureError}` }, 422);
        return sendJson(res, { image: result.image, rotation: result.rotation });
      } catch {
        return sendJson(res, { error: 'timeout — boîtier non connecté ou bridge inactif' }, 504);
      }
    }

    if (req.method === 'POST' && pathname === '/api/preview/request') {
      if (!requireAuth(req)) return sendJson(res, { message: 'Non autorise' }, 401);
      if (captureResolve) { captureResolve = null; }
      sendToApp('capture-request', {});
      try {
        const result = await Promise.race([
          new Promise(resolve => { captureResolve = resolve; }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ]);
        if (result.captureError) {
          return sendJson(res, { error: `Erreur capture RN : ${result.captureError}` }, 422);
        }
        return sendJson(res, { image: result.image, rotation: result.rotation });
      } catch {
        return sendJson(res, { error: 'timeout — boîtier non connecté ou bridge inactif' }, 504);
      }
    }

    return notFound(res);
  } catch (error) {
    console.error('Unhandled server error', error);
    sendToApp('server-error', { message: 'Erreur serveur.' });
    return sendJson(res, { message: 'Erreur serveur.' }, 500);
  }
});

const PORT = process.env.NODE_SERVER_PORT || 3000;

const { metadataDir } = require('./lib/config');
const TV_SCHEDULE_FILE = path.join(metadataDir, 'tv-schedule.json');
const DEFAULT_TV_SCHEDULE = { enabled: false, startTime: '08:00', stopTime: '22:00', days: [1, 2, 3, 4, 5] };

const readTvSchedule = () => {
  try {
    const raw = fs.readFileSync(TV_SCHEDULE_FILE, 'utf8');
    return { ...DEFAULT_TV_SCHEDULE, ...JSON.parse(raw) };
  } catch (_) { return DEFAULT_TV_SCHEDULE; }
};

const writeTvSchedule = (schedule) => {
  fs.mkdirSync(path.dirname(TV_SCHEDULE_FILE), { recursive: true });
  fs.promises.writeFile(TV_SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8')
    .catch((err) => console.error('[tv-schedule] write failed:', err.message));
};

initDB();
sequences.initSequences();

const startServer = async () => {
  sendToApp('server-stage', { stage: 'startServer-enter' });
  await initAuth();
  sendToApp('server-stage', { stage: 'initAuth-done' });

  try {
    await migrateToSequences();
  } catch (err) {
    console.error('Migration error (non-fatal):', err);
  }

  server.listen(PORT, '0.0.0.0', async () => {
    console.log(`Node server ready on port ${PORT}`);
    await refreshContentAsync();
    sendToApp('server-ready', { port: PORT });
    broadcastDisplaySettings();
    const tvSched = readTvSchedule();
    sendToApp('tv-schedule-updated', { schedule: tvSched });
  });
};

startServer();

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
  sendToApp('server-error', { message: error.message });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
  const message =
    reason && typeof reason === 'object' && 'message' in reason
      ? reason.message
      : 'Erreur inconnue';
  sendToApp('server-error', { message });
});
