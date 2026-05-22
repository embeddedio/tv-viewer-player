const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { sendToApp } = require('./bridge');
const { configLock, metadataLock, safeWriteFile } = require('./utils');

// Tout à plat dans le même dossier — même architecture que devyol
const EXTERNAL_BASE = process.env.TV_STORAGE_PATH || '/storage/emulated/0/Documents/tv-viewer';
let uploadsDir = EXTERNAL_BASE;
let metadataDir = EXTERNAL_BASE;
let metadataPath = path.join(metadataDir, 'metadata.json');
let foldersPath = path.join(metadataDir, 'folders.json');
let configPath = path.join(metadataDir, 'config.json');
const DEFAULT_DURATION = 10;


const allowedOrientations = ['portrait-up', 'portrait-down', 'landscape-left', 'landscape-right'];

const defaultTickerItems = [
  {
    code: 'USD',
    label: 'Dollar US',
    icon: '$',
    buyLabel: 'Achat',
    sellLabel: 'Vente',
  },
  {
    code: 'EUR',
    label: 'Euro',
    icon: '€',
    buyLabel: 'Achat',
    sellLabel: 'Vente',
  },
  {
    code: 'GBP',
    label: 'Livre',
    icon: '£',
    buyLabel: 'Achat',
    sellLabel: 'Vente',
  },
];

const defaultConfig = {
  orientation: 'portrait-up',
  ticker: {
    heightPercent: 10,
    itemGap: 28,
    scale: 90,
    speed: 100,
    items: defaultTickerItems,
  },
  defaultSequenceId: null,
};

// In-memory DB synchronized with JSON files
const db = {
  rotation: defaultConfig.orientation,
  ecart: defaultConfig.ticker.itemGap,
  tickerItems: defaultConfig.ticker.items,
  content: [],
};

const loadJsonSafeAsync = async (p, fallback) => {
  try {
    const raw = await fsPromises.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};

const loadJsonSafeSync = (p, fallback) => {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
};

// Sync init for DB startup — lit directement depuis le filesystem (fs natif Node.js)
const initDB = () => {
  // Dossier créé nativement par StorageModule.kt — filet de sécurité uniquement
  try { fs.mkdirSync(EXTERNAL_BASE, { recursive: true }); } catch (_) {}

  const cfg = loadJsonSafeSync(configPath, defaultConfig);
  const meta = loadJsonSafeSync(metadataPath, []);
  db.rotation = sanitizeOrientation(cfg.orientation) || defaultConfig.orientation;
  const tSan = sanitizeTicker(cfg.ticker || {});
  db.ecart = tSan.itemGap;
  db.tickerItems = Array.isArray(tSan.items) && tSan.items.length
    ? tSan.items
    : defaultTickerItems;
  
  // Build content from metadata + filesystem sizes
  const allowedCategories = ['logo', 'media'];
  const metaMap = new Map(meta.map(m => [m.name, m]));
  
  db.content = meta
    .map((entry) => {
      if (!entry || typeof entry.name !== 'string') return null;
      const filePath = path.join(uploadsDir, entry.name);
      try {
        const stats = fs.statSync(filePath);
        const [category = 'media'] = entry.name.split('-');
        const safeCategory = allowedCategories.includes(category) ? category : 'media';
        return { 
            name: entry.name, 
            originalName: entry.originalName || entry.name,
            duration: Math.max(1, parseInt(entry.duration, 10) || DEFAULT_DURATION), 
            size: stats.size, 
            category: safeCategory 
        };
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
};

const persistConfigPartialAsync = async (partial) => {
  const release = await configLock.lock();
  try {
    const current = await loadJsonSafeAsync(configPath, defaultConfig);
    const next = { ...current };
    if (partial.orientation !== undefined) next.orientation = sanitizeOrientation(partial.orientation);
    if (partial.ticker) {
      const t = partial.ticker;
      next.ticker = { ...current.ticker };
      if (t.heightPercent !== undefined) next.ticker.heightPercent = sanitizeTicker({ heightPercent: t.heightPercent }).heightPercent;
      if (t.scale !== undefined) next.ticker.scale = sanitizeTicker({ scale: t.scale }).scale;
      if (t.speed !== undefined) next.ticker.speed = sanitizeTicker({ speed: t.speed }).speed;
      if (t.itemGap !== undefined) next.ticker.itemGap = sanitizeTicker({ itemGap: t.itemGap }).itemGap;
      if (t.items !== undefined && Array.isArray(t.items) && t.items.length) next.ticker.items = sanitizeTicker({ items: t.items }).items;
    }
    const written = JSON.stringify(next, null, 2);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    await safeWriteFile(configPath, written);
  } finally {
    release();
  }
};

// Getters
const getContent = () => db.content.slice();
const getDevises = () => db.tickerItems.slice();
const getRotation = () => db.rotation;
const getEcart = () => db.ecart;

// Setters (single-field updates)
const setContent = async (files) => {
  if (!Array.isArray(files)) return;
  
  const currentContentMap = new Map(db.content.map(c => [c.name, c]));

  const sanitized = files
    .map((f) => {
        const physicalName = String(f.name || '');
        const current = currentContentMap.get(physicalName);
        return { 
            name: physicalName, 
            originalName: f.originalName || current?.originalName || physicalName,
            duration: Math.max(1, parseInt(String(f.duration || DEFAULT_DURATION), 10) || DEFAULT_DURATION) 
        };
    })
    .filter((f) => f.name);
  
  db.content = sanitized.map((f) => ({ ...f, category: (f.name.split('-')[0] || 'media') }));
  
  // persist to metadata.json
  const meta = sanitized.map((f) => ({ 
      name: f.name, 
      originalName: f.originalName, 
      duration: f.duration 
  }));
  
  const release = await metadataLock.lock();
  try {
    const written = JSON.stringify(meta, null, 2);
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
    await safeWriteFile(metadataPath, written);
  } finally {
    release();
  }

  sendToApp('display-content', { files: getContent() });
};

const setDevises = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;
  const clean = sanitizeTickerItems(items);
  if (!clean.length) return;
  db.tickerItems = clean;
  await persistConfigPartialAsync({ ticker: { items: clean } });
  sendToApp('display-devises', { items: getDevises() });
};

const setRotation = async (value) => {
  const rot = sanitizeOrientation(value);
  db.rotation = rot;
  await persistConfigPartialAsync({ orientation: rot });
  sendToApp('display-rotation', { orientation: rot });
  return rot;
};

const setEcart = async (value) => {
  const n = Math.max(0, Math.min(200, Math.trunc(Number(value)))) || 0;
  db.ecart = n;
  await persistConfigPartialAsync({ ticker: { itemGap: n } });
  sendToApp('display-ecart', { itemGap: n });
  return n;
};

const sanitizeOrientation = (value) =>
  allowedOrientations.includes(value) ? value : defaultConfig.orientation;

const sanitizeTickerItems = (items) => {
  if (!Array.isArray(items)) {
    return defaultTickerItems;
  }

  const asNonEmptyString = (value, fallback = '') => {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return fallback;
  };

  const sanitized = items
    .map((item) => {
      if (!item || typeof item.code !== 'string') {
        return null;
      }
      const code = item.code.trim().toUpperCase();
      if (!code) {
        return null;
      }
      const label = asNonEmptyString(item.label, code);
      const icon = asNonEmptyString(item.icon, code.charAt(0));
      const buyLabel = asNonEmptyString(item.buyLabel, 'Achat');
      const sellLabel = asNonEmptyString(item.sellLabel, 'Vente');
      const buy = asNonEmptyString(item.buy, '');
      const sell = asNonEmptyString(item.sell, '');
      return { code, label, icon, buyLabel, sellLabel, buy, sell };
    })
    .filter(Boolean);
  return sanitized.length ? sanitized : defaultTickerItems;
};

const sanitizeTicker = (ticker = {}) => {
  const heightPercent = Math.max(
    5,
    Math.min(100, Number(ticker.heightPercent) || defaultConfig.ticker.heightPercent)
  );
  const scale = (() => {
    const n = Number(ticker.scale);
    if (!Number.isFinite(n)) return defaultConfig.ticker.scale;
    return Math.max(10, Math.min(500, Math.trunc(n)));
  })();
  const speed = (() => {
    const n = Number(ticker.speed);
    if (!Number.isFinite(n)) return defaultConfig.ticker.speed;
    return Math.max(10, Math.min(1000, Math.trunc(n)));
  })();
  const itemGap = (() => {
    const n = Number(ticker.itemGap);
    if (!Number.isFinite(n)) return defaultConfig.ticker.itemGap;
    return Math.max(0, Math.min(200, Math.trunc(n)));
  })();
  return {
    heightPercent,
    scale,
    speed,
    itemGap,
    items: sanitizeTickerItems(ticker.items),
  };
};

const getAppConfigAsync = async () => {
  const raw = await loadJsonSafeAsync(configPath, {});
  return {
    orientation: sanitizeOrientation(raw.orientation),
    ticker: sanitizeTicker(raw.ticker),
    widgetStyles: raw.widgetStyles || {},
  };
};

const readRawConfigAsync = async () => {
  try {
    const raw = await fsPromises.readFile(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
};

// Full config rewrite
const writeConfigAsync = async (partial = {}) => {
  const release = await configLock.lock();
  try {
    const currentRaw = await loadJsonSafeAsync(configPath, defaultConfig);
    const current = {
       orientation: sanitizeOrientation(currentRaw.orientation),
       ticker: sanitizeTicker(currentRaw.ticker),
       widgetStyles: currentRaw.widgetStyles || {},
    };

    const next = { ...current };

    if (Object.prototype.hasOwnProperty.call(partial, 'orientation')) {
      next.orientation = sanitizeOrientation(partial.orientation);
    }

    if (partial.ticker && typeof partial.ticker === 'object') {
      const sanitized = sanitizeTicker({
        ...(Object.prototype.hasOwnProperty.call(partial.ticker, 'heightPercent')
          ? { heightPercent: partial.ticker.heightPercent }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(partial.ticker, 'scale')
          ? { scale: partial.ticker.scale }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(partial.ticker, 'speed')
          ? { speed: partial.ticker.speed }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(partial.ticker, 'itemGap')
          ? { itemGap: partial.ticker.itemGap }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(partial.ticker, 'items')
          ? { items: partial.ticker.items }
          : {}),
      });

      if (Object.prototype.hasOwnProperty.call(partial.ticker, 'heightPercent')) {
        next.ticker.heightPercent = sanitized.heightPercent;
      }
      if (Object.prototype.hasOwnProperty.call(partial.ticker, 'scale')) {
        next.ticker.scale = sanitized.scale;
      }
      if (Object.prototype.hasOwnProperty.call(partial.ticker, 'speed')) {
        next.ticker.speed = sanitized.speed;
      }
      if (Object.prototype.hasOwnProperty.call(partial.ticker, 'itemGap')) {
        next.ticker.itemGap = sanitized.itemGap;
      }
      if (Object.prototype.hasOwnProperty.call(partial.ticker, 'items')) {
        if (Array.isArray(sanitized.items) && sanitized.items.length > 0) {
          next.ticker.items = sanitized.items;
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(partial, 'widgetStyles')) {
      next.widgetStyles = partial.widgetStyles;
    }

    const written = JSON.stringify(next, null, 2);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    await safeWriteFile(configPath, written);
    return next;
  } finally {
    release();
  }
};

const updateOrientation = async (value) => {
  const config = await writeConfigAsync({ orientation: value });
  return config.orientation;
};

const updateTickerSettings = async (ticker) => {
  const config = await writeConfigAsync({ ticker });
  return config.ticker;
};

const broadcastDisplaySettings = async () => {
  const config = await getAppConfigAsync();
  sendToApp('display-settings', config);
};

/**
 * Migrate old schedule/display format to new sequences system.
 * Detects old config.schedule.days, creates sequences in sequences.json, cleans config.
 */
const migrateToSequences = async () => {
  const raw = await loadJsonSafeAsync(configPath, {});
  if (!raw.schedule && !raw.display) return; // Already migrated or fresh install

  const { generateId, sanitizeSequence, setAll } = require('./sequences');
  const sequencesPath = path.join(metadataDir, 'sequences.json');

  // Load existing sequences (if any)
  let existingSequences = [];
  try {
    const seqRaw = await fsPromises.readFile(sequencesPath, 'utf8');
    existingSequences = JSON.parse(seqRaw);
    if (!Array.isArray(existingSequences)) existingSequences = [];
  } catch (_) {}

  // Only migrate if no sequences exist yet
  if (existingSequences.length > 0) {
    // Just clean old fields from config
    const release = await configLock.lock();
    try {
      const current = await loadJsonSafeAsync(configPath, defaultConfig);
      delete current.display;
      delete current.schedule;
      if (!current.defaultSequenceId) current.defaultSequenceId = null;
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      await safeWriteFile(configPath, JSON.stringify(current, null, 2));
    } finally {
      release();
    }
    return;
  }

  const newSequences = [];

  // Migrate default display as a "default" sequence
  if (raw.display || raw.schedule?.default) {
    const display = raw.display || raw.schedule?.default || {};
    const seq = sanitizeSequence({
      id: generateId(),
      name: 'Affichage par défaut',
      priority: 1,
      scheduleType: 'continue',
      startDate: '',
      endDate: '',
      startTime: '00:00',
      endTime: '23:59',
      days: [],
      layoutId: display.layoutId || 'fullscreen',
      customZones: null,
      zones: display.zones || { main: { type: 'playlist', items: [] } },
    });
    newSequences.push(seq);
  }

  // Migrate day-based schedules
  if (raw.schedule?.enabled && raw.schedule?.days) {
    const dayMap = raw.schedule.days;
    for (const [day, display] of Object.entries(dayMap)) {
      if (!display) continue;
      const seq = sanitizeSequence({
        id: generateId(),
        name: `Planning ${day}`,
        priority: 10,
        scheduleType: 'custom',
        startDate: '',
        endDate: '',
        startTime: '00:00',
        endTime: '23:59',
        days: [day],
        layoutId: display.layoutId || 'fullscreen',
        customZones: null,
        zones: display.zones || { main: { type: 'playlist', items: [] } },
      });
      newSequences.push(seq);
    }
  }

  if (newSequences.length > 0) {
    await setAll(newSequences);
    console.log(`Migration: ${newSequences.length} séquence(s) créée(s) depuis l'ancien format.`);
  }

  // Clean old fields from config and set defaultSequenceId
  const release = await configLock.lock();
  try {
    const current = await loadJsonSafeAsync(configPath, defaultConfig);
    delete current.display;
    delete current.schedule;
    current.defaultSequenceId = newSequences.length > 0 ? newSequences[0].id : null;
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
      await safeWriteFile(configPath, JSON.stringify(current, null, 2));
  } finally {
    release();
  }
};

const getDefaultSequenceId = () => {
  const raw = loadJsonSafeSync(configPath, {});
  return raw.defaultSequenceId || null;
};

module.exports = {
  db,
  initDB,
  loadJsonSafeAsync,
  loadJsonSafeSync,
  persistConfigPartialAsync,
  writeConfigAsync,
  getAppConfigAsync,
  readRawConfigAsync,
  updateOrientation,
  updateTickerSettings,
  broadcastDisplaySettings,
  getContent,
  getDevises,
  getRotation,
  getEcart,
  setContent,
  setDevises,
  setRotation,
  setEcart,
  sanitizeOrientation,
  sanitizeTicker,
  sanitizeTickerItems,
  defaultConfig,
  defaultTickerItems,
  allowedOrientations,
  get configPath() { return configPath; },
  get metadataPath() { return metadataPath; },
  get foldersPath() { return foldersPath; },
  get uploadsDir() { return uploadsDir; },
  DEFAULT_DURATION,
  get metadataDir() { return metadataDir; },
  migrateToSequences,
  getDefaultSequenceId,
};
