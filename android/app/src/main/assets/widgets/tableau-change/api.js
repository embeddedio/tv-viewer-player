'use strict';
// Module autonome — aucune dépendance vers server/lib/
// Cache dans __dirname (dossier du widget en Documents)
const https = require('https');
const fs = require('fs');
const path = require('path');

const BESTCHANGE_URL = 'https://bestchangetanger.com/cours-des-billets-de-banques-etrangers/';
const BKAM_URL = 'https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference';
const REFRESH_MS = 30 * 60 * 1000;
const CACHE_FILE = path.join(__dirname, 'cache.json');
const OVERRIDES_FILE = path.join(__dirname, 'overrides.json');

// ─── État en mémoire ──────────────────────────────────────────────────────────

const state = { updatedAt: null, rates: [], bkamByCode: {}, stale: false, error: null, overrides: {} };
let initialized = false;
let refreshTimer = null;
let firstRefreshPromise = null;

// ─── Utilitaires HTML ─────────────────────────────────────────────────────────

const HTML_ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

const decodeEntities = (s = '') =>
  String(s).replace(/&[a-zA-Z0-9#]+;/g, m => HTML_ENTITIES[m] || m);

const stripTags = (s = '') =>
  decodeEntities(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const cleanText = (s = '') => String(stripTags(s) || '').replace(/\s+/g, ' ').trim();

const parseNum = (v) => {
  const n = Number(cleanText(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const fmtNum = (v, d = 2) => Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '';

const fmtVal = (v) => {
  const n = parseNum(v);
  return Number.isFinite(n) ? fmtNum(n, 2) : cleanText(v);
};

const resolveUrl = (src = '') => {
  try { return new URL(src, BESTCHANGE_URL).toString(); } catch (_) { return src; }
};

// ─── Date BKAM (sans Intl — non disponible dans nodejs-mobile) ───────────────

const formatDateForBkam = (daysOffset) => {
  const ms = Date.now() + 60 * 60 * 1000 + (daysOffset || 0) * 86400000; // UTC+1 Casablanca
  const d = new Date(ms);
  return String(d.getUTCDate()).padStart(2, '0') + '/' +
         String(d.getUTCMonth() + 1).padStart(2, '0') + '/' +
         String(d.getUTCFullYear());
};

// ─── Scraping ─────────────────────────────────────────────────────────────────

const fetchHtml = (url, hops = 0) =>
  new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', Accept: 'text/html' },
      rejectUnauthorized: false,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 3) {
        res.resume();
        try { url = new URL(res.headers.location, url).toString(); } catch (_) { url = res.headers.location; }
        return resolve(fetchHtml(url, hops + 1));
      }
      if (res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });

const parseRates = (html) => {
  const tableHtml = (
    html.match(/<table[^>]*class=["'][^"']*table-cours[^"']*["'][\s\S]*?<\/table>/i) ||
    html.match(/<table[\s\S]*?<\/table>/i) || []
  )[0] || '';

  const tbody = (tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i) || [])[1] || tableHtml;
  const rows = tbody.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  return rows.map(rowHtml => {
    const cells = rowHtml.match(/<td[\s\S]*?<\/td>/gi) || [];
    let iconUrl = '';
    const vals = [];

    cells.forEach(cell => {
      const img = cell.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (img) {
        if (!iconUrl) iconUrl = resolveUrl(img[1]);
        const fname = cleanText((img[1].split('/').pop() || '').split('.')[0]).toLowerCase();
        if (fname) vals.push(fname);
      }
      const t = cleanText(cell);
      if (t) vals.push(t);
    });

    const flat = vals.join(',').split(',').map(v => cleanText(v)).filter(Boolean);
    if (flat.length < 5) return null;

    let code = cleanText(flat[1]).toUpperCase().split('-')[0];
    const label = cleanText(flat[2]);
    if (!code && label) code = cleanText(label.split('-')[0]).toUpperCase();
    if (!code || code === 'CODE') return null;

    return { unit: cleanText(flat[0]), code, label, buy: fmtVal(flat[3]), sell: fmtVal(flat[4]), icon: iconUrl };
  }).filter(Boolean);
};

// ─── Scraping BKAM ───────────────────────────────────────────────────────────

const parseBkamHtml = (html) => {
  const map = {};
  const tableM = html.match(/<table[^>]*class=["'][^"']*dynamic_contents_ref_18[^"']*["'][\s\S]*?<\/table>/i);
  if (!tableM) return map;
  const rows = tableM[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
  rows.forEach(row => {
    const cells = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 2) return;
    const hrefM = cells[0].match(/href=["'][^"']*\/graph\/currency\/([a-z]{3})/i);
    const code = hrefM ? hrefM[1].toLowerCase() : null;
    if (!code) return;
    const numM = cells[1].match(/class=["'][^"']*number[^"']*["'][^>]*>([^<]*)</i);
    const raw = cleanText(numM ? numM[1] : cells[1].replace(/<[^>]*>/g, ''));
    const n = parseNum(raw);
    if (!Number.isFinite(n)) return;
    const digits = Math.min((raw.indexOf(',') >= 0 ? raw.slice(raw.indexOf(',') + 1).replace(/\D/g, '').length : 4) || 4, 6);
    map[code] = { reference: fmtNum(n, digits), tpe: fmtNum(n * 0.95, digits) };
  });
  return map;
};

const fetchBkamForDate = (dateStr) =>
  new Promise((resolve) => {
    const url = BKAM_URL + '?date=' + encodeURIComponent(dateStr);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }, rejectUnauthorized: false }, res => {
      if (res.statusCode >= 400) { res.resume(); return resolve({}); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(parseBkamHtml(Buffer.concat(chunks).toString('utf8'))));
    }).on('error', () => resolve({}));
  });

const refreshBkam = async () => {
  for (let i = 0; i >= -5; i--) {
    try {
      const map = await fetchBkamForDate(formatDateForBkam(i));
      if (Object.keys(map).length > 0) { state.bkamByCode = map; return; }
    } catch (_) {}
  }
};

// ─── Cache persistant ─────────────────────────────────────────────────────────

const loadCache = () => {
  try {
    const d = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Array.isArray(d.rates)) return d;
  } catch (_) {}
  return null;
};

const saveCache = () => {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ updatedAt: state.updatedAt, rates: state.rates, stale: state.stale, error: state.error }), 'utf8');
  } catch (_) {}
};

const loadOverrides = () => {
  try { return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8')) || {}; } catch (_) { return {}; }
};

const saveOverrides = () => {
  try { fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(state.overrides, null, 2), 'utf8'); } catch (_) {}
};

// ─── Overrides ────────────────────────────────────────────────────────────────

const isSameDay = (d) => d && new Date(d).toDateString() === new Date().toDateString();

const cleanExpired = () => {
  for (const code of Object.keys(state.overrides)) {
    if (!state.overrides[code]?.isUpdated || !isSameDay(state.overrides[code]?.updatedAt)) {
      delete state.overrides[code];
    }
  }
};

const applyOverrides = (rates) => rates.map(r => {
  const ov = state.overrides[r.code];
  if (!ov?.isUpdated || !isSameDay(ov.updatedAt)) return r;
  const p = { ...r };
  if (ov.buy  !== undefined && ov.buy  !== '') p.buy  = ov.buy;
  if (ov.sell !== undefined && ov.sell !== '') p.sell = ov.sell;
  return p;
});

// ─── Refresh ──────────────────────────────────────────────────────────────────

const refresh = async () => {
  try {
    const [html] = await Promise.all([fetchHtml(BESTCHANGE_URL), refreshBkam()]);
    const rates = parseRates(html);
    if (!rates.length) throw new Error('Aucune devise parsée');
    state.updatedAt = new Date().toISOString();
    state.rates = rates;
    state.stale = false;
    state.error = null;
    cleanExpired();
    saveCache();
    console.log(`[tableau-change] ${rates.length} devises mises à jour`);
  } catch (err) {
    state.stale = true;
    state.error = err.message || 'Erreur scraping';
    const cached = loadCache();
    if (cached && !state.rates.length) {
      state.updatedAt = cached.updatedAt;
      state.rates = cached.rates;
    }
    saveCache();
    console.error('[tableau-change] Erreur refresh:', err.message);
  }
};

// ─── Init (lancé au premier accès) ───────────────────────────────────────────

const init = () => {
  if (initialized) return;
  initialized = true;
  const cached = loadCache();
  if (cached) {
    state.updatedAt = cached.updatedAt;
    state.rates = cached.rates;
    state.stale = cached.stale;
    state.error = cached.error;
  }
  state.overrides = loadOverrides();
  cleanExpired();
  firstRefreshPromise = refresh();
  refreshTimer = setInterval(refresh, REFRESH_MS);
};

// ─── Lecture corps requête ────────────────────────────────────────────────────

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

// ─── Réponse données ──────────────────────────────────────────────────────────

const currentData = () => {
  cleanExpired();
  return { updatedAt: state.updatedAt, rates: applyOverrides(state.rates), bkamByCode: state.bkamByCode, stale: state.stale, error: state.error, overrides: state.overrides };
};

// ─── Exports ──────────────────────────────────────────────────────────────────

exports.getData = async function(req, res, sendJson) {
  if (!initialized) init();
  if (!state.rates.length && firstRefreshPromise) {
    await Promise.race([firstRefreshPromise, new Promise(r => setTimeout(r, 25000))]);
  }
  sendJson(res, currentData());
};

exports.handleRequest = async function(method, pathname, req, res, sendJson) {
  if (!initialized) init();

  if (method === 'GET' && pathname === '/api/widgets/tableau-change') {
    if (!state.rates.length && firstRefreshPromise) {
      await Promise.race([firstRefreshPromise, new Promise(r => setTimeout(r, 25000))]);
    }
    return sendJson(res, currentData());
  }

  if (method === 'POST' && pathname === '/api/widgets/tableau-change/overrides') {
    try {
      const body = await readBody(req);
      const { overrides } = JSON.parse(body);
      if (!Array.isArray(overrides)) return sendJson(res, { message: 'Format invalide' }, 400);
      const now = new Date().toISOString();
      for (const entry of overrides) {
        if (!entry.code) continue;
        const code = String(entry.code).trim().toUpperCase();
        const ex = state.overrides[code] || {};
        const buy  = entry.buy  !== undefined ? String(entry.buy).trim()  : ex.buy;
        const sell = entry.sell !== undefined ? String(entry.sell).trim() : ex.sell;
        const bkamRef = entry.bkamRef !== undefined ? String(entry.bkamRef).trim() : ex.bkamRef;
        const hasVal = [buy, sell, bkamRef].some(v => v !== undefined && v !== '');
        if (!hasVal) { delete state.overrides[code]; }
        else { state.overrides[code] = { buy, sell, bkamRef, isUpdated: true, updatedAt: now }; }
      }
      saveOverrides();
      return sendJson(res, { success: true, overrides: state.overrides });
    } catch (e) {
      return sendJson(res, { message: 'Requête invalide' }, 400);
    }
  }

  if (method === 'DELETE' && pathname === '/api/widgets/tableau-change/overrides') {
    state.overrides = {};
    saveOverrides();
    return sendJson(res, { success: true });
  }

  // 404 pour toute autre route
  sendJson(res, { message: 'Not found' }, 404);
};
