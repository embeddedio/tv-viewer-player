import { NativeModules } from 'react-native';
import type { ExchangeRate, BkamRate, CombinedRate } from '../../shared/types';

const BESTCHANGE_URL =
  'https://bestchangetanger.com/cours-des-billets-de-banques-etrangers/';
const BKAM_REFERENCE_URL =
  'https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference';

let FOLDER_NAME       = 'tv-viewer-dev';  // surchargé via setStorageFolderName()
const CACHE_FILE      = 'tableau-change-combined.json';
const OVERRIDES_FILE  = 'tableau-change-overrides.json';
const REFRESH_MS      = 30 * 60 * 1000;

/** Appelé par TableauChange.tsx dès que storageFolderName est connu depuis le contexte. */
export function setStorageFolderName(name: string): void {
  FOLDER_NAME = name;
}

type BkamRateMap = Record<string, { reference: string; tpe: string }>;

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

// ─── Utilitaires HTML ────────────────────────────────────────────────────────

const htmlEntityMap: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>',
};

function decodeHtmlEntities(v = ''): string {
  return String(v).replace(/&[a-zA-Z0-9#]+;/g, m => htmlEntityMap[m] || m);
}
function stripTags(v = ''): string {
  return decodeHtmlEntities(String(v).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function cleanText(v = ''): string {
  return String(stripTags(v) || '').replace(/\s+/g, ' ').trim();
}
function parseRateNumber(v: string): number | null {
  const n = Number(cleanText(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function formatRateNumber(v: number, digits = 2): string {
  return Number.isFinite(v) ? v.toFixed(digits).replace('.', ',') : '';
}
function formatToTwoDecimals(v: string): string {
  const n = parseRateNumber(v);
  return Number.isFinite(n) ? formatRateNumber(n as number, 2) : cleanText(v);
}
function getRatePrecision(v: string, fallback: number): number {
  const raw = cleanText(v);
  if (!raw) return fallback;
  const idx = raw.indexOf(',');
  if (idx < 0) return fallback;
  return Math.min(raw.slice(idx + 1).replace(/\D/g, '').length || fallback, 6);
}
function extractTableHtml(html = '', cls?: string): string {
  if (cls) {
    const m = html.match(new RegExp(`<table[^>]*class=["'][^"']*${cls}[^"']*["'][\\s\\S]*?<\\/table>`, 'i'));
    if (m) return m[0];
  }
  return (html.match(/<table[\s\S]*?<\/table>/i) || [''])[0];
}
function parseTableRows(tableHtml = ''): string[] {
  const body = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  return (body ? body[1] : tableHtml).match(/<tr[\s\S]*?<\/tr>/gi) || [];
}

async function fetchHtml(url: string): Promise<string> {
  const r = await fetch(url, { headers: FETCH_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
  return r.text();
}

// ─── Parsers BestChange ───────────────────────────────────────────────────────

function parseBestChangeRates(html: string): ExchangeRate[] {
  const tableHtml = extractTableHtml(html, 'table-cours');
  if (!tableHtml) return [];
  return parseTableRows(tableHtml).map(rowHtml => {
    const vals: string[] = [];
    let iconUrl = '';
    const cells = rowHtml.match(/<td[\s\S]*?<\/td>/gi) || [];
    cells.forEach(cell => {
      const img = cell.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (img) {
        if (!iconUrl) iconUrl = img[1] || '';
        const name = cleanText((img[1].split('/').pop() || '').split('.')[0]).toLowerCase();
        if (name) vals.push(name);
      }
      const t = cleanText(cell);
      if (t) vals.push(t);
    });
    const flat = vals.join(',').split(',').map(p => cleanText(p)).filter(Boolean);
    if (flat.length < 5) return null;
    const unit = cleanText(flat[0]);
    let code = cleanText(flat[1]).toUpperCase().split('-')[0];
    const label = cleanText(flat[2]);
    const buy  = formatToTwoDecimals(flat[3]);
    const sell = formatToTwoDecimals(flat[4]);
    if (!code && label) code = cleanText(label.split('-')[0]).toUpperCase();
    if (!code || code === 'CODE') return null;
    return { unit, code, label, buy, sell, icon: iconUrl };
  }).filter((v): v is ExchangeRate => Boolean(v));
}

// ─── Parsers BKAM ────────────────────────────────────────────────────────────

function formatDateForBkam(offset: number): string {
  const d = new Date();
  if (offset) d.setDate(d.getDate() + offset);
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  let day = '', month = '', year = '';
  parts.forEach(p => {
    if (p.type === 'day') day = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'year') year = p.value;
  });
  return `${day}/${month}/${year}`;
}

async function fetchBkamForDate(dateStr: string): Promise<BkamRateMap> {
  const html = await fetchHtml(`${BKAM_REFERENCE_URL}?date=${encodeURIComponent(dateStr)}`);
  const map: BkamRateMap = {};
  const tableHtml = extractTableHtml(html, 'dynamic_contents_ref_18');
  if (!tableHtml) return map;
  parseTableRows(tableHtml).forEach(rowHtml => {
    const cells = rowHtml.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 2) return;
    const first = cells[0], mid = cells[1];
    const hrefM = first.match(/href=["'][^"']*\/graph\/currency\/([a-z]{3})/i);
    const titleM = first.match(/title=["']([^"']+)["']/i);
    const codeM = cleanText(titleM ? titleM[1] : cleanText(first)).match(/\(([A-Z]{3})\)\s*$/);
    const code = (hrefM ? cleanText(hrefM[1]).toLowerCase() : '') || (codeM ? cleanText(codeM[1]).toLowerCase() : '');
    if (!code) return;
    const numM = mid.match(/class=["'][^"']*number[^"']*["'][^>]*>([^<]*)</i);
    const raw = cleanText(numM ? numM[1] : mid.replace(/<[^>]*>/g, ''));
    const ref = parseRateNumber(raw);
    if (!Number.isFinite(ref)) return;
    const digits = getRatePrecision(raw, 4);
    map[code] = { reference: formatRateNumber(ref as number, digits), tpe: formatRateNumber((ref as number) * 0.95, digits) };
  });
  return map;
}

// Tous les jours en parallèle — 1 round-trip au lieu de 6 séquentiels
async function fetchBkamMapParallel(): Promise<BkamRateMap> {
  const results = await Promise.allSettled(
    [0, -1, -2, -3, -4, -5].map(n => fetchBkamForDate(formatDateForBkam(n)))
  );
  for (const r of results) {
    if (r.status === 'fulfilled' && Object.keys(r.value).length > 0) return r.value;
  }
  return {};
}

// ─── Exports pour les variants simple / bkam et TickerDevises ────────────────

export async function fetchTableauChangeRates(): Promise<ExchangeRate[]> {
  const rates = parseBestChangeRates(await fetchHtml(BESTCHANGE_URL));
  try {
    const overrides = await loadOverrides();
    return rates.map(rate => {
      const o = overrides[rate.code];
      const active = o?.isUpdated && isSameDay(o.updatedAt);
      if (!active) return rate;
      return { ...rate, buy: o.buy || rate.buy, sell: o.sell || rate.sell };
    });
  } catch (_) {
    return rates;
  }
}

export async function fetchBkamRates(): Promise<BkamRate[]> {
  const [rates, bkamMap] = await Promise.all([fetchTableauChangeRates(), fetchBkamMapParallel()]);
  if (!rates.length) throw new Error('Aucune devise parsee depuis BestChange');
  let overrides: OverrideMap = {};
  try { overrides = await loadOverrides(); } catch (_) {}
  return rates.map(rate => {
    const b = bkamMap[rate.code.toLowerCase().split('-')[0]];
    const o = overrides[rate.code];
    const active = o?.isUpdated && isSameDay(o.updatedAt);
    const bkamRef = (active && o!.bkamRef) ? o!.bkamRef : (b?.reference || '-');
    const n = (active && o!.bkamRef) ? parseRateNumber(o!.bkamRef) : null;
    const bkamTpe = Number.isFinite(n) ? formatRateNumber((n as number) * 0.95, 4) : (b?.tpe || '-');
    return { code: rate.code, label: rate.label, unit: rate.unit, bkamReference: bkamRef, bkamTpe, icon: rate.icon };
  });
}

// ─── Store singleton — moulinette autonome pour le variant combined ───────────

interface StoreState {
  rates:     CombinedRate[];
  bkamMap:   BkamRateMap;
  fetchedAt: number;
  isStale:   boolean;
  isReady:   boolean;
}

const store: StoreState = { rates: [], bkamMap: {}, fetchedAt: 0, isStale: false, isReady: false };
const listeners = new Set<() => void>();
let initialized = false;

function notify() { listeners.forEach(fn => fn()); }

type OverrideMap = Record<string, { buy?: string; sell?: string; bkamRef?: string; isUpdated?: boolean; updatedAt?: string }>;

function isSameDay(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function mergeRates(bcRates: ExchangeRate[], bkamMap: BkamRateMap, overrides: OverrideMap = {}): CombinedRate[] {
  return bcRates.map(rate => {
    const b   = bkamMap[rate.code.toLowerCase().split('-')[0]];
    const ov  = overrides[rate.code];
    const active = ov?.isUpdated && isSameDay(ov.updatedAt);

    const buy  = active && ov!.buy  ? ov!.buy  : rate.buy;
    const sell = active && ov!.sell ? ov!.sell : rate.sell;

    let bkamReference = b?.reference || '-';
    let bkamTpe       = b?.tpe       || '-';
    if (active && ov!.bkamRef) {
      bkamReference = ov!.bkamRef;
      const n = parseRateNumber(ov!.bkamRef);
      bkamTpe = Number.isFinite(n) ? formatRateNumber((n as number) * 0.95, 4) : '-';
    }

    return { code: rate.code, label: rate.label, unit: rate.unit, buy, sell, icon: rate.icon, bkamReference, bkamTpe };
  });
}

async function loadCache(): Promise<void> {
  try {
    const raw: string = await NativeModules.StorageModule.readFile(CACHE_FILE);
    const cached = JSON.parse(raw);
    if (cached && Array.isArray(cached.rates) && cached.rates.length > 0) {
      store.rates    = cached.rates;
      store.bkamMap  = cached.bkamMap || {};
      store.fetchedAt = cached.fetchedAt || 0;
      store.isStale  = true;
      store.isReady  = true;
      notify();
    }
  } catch (_) { /* cache absent — on continue avec le fetch réseau */ }
}

async function saveCache(): Promise<void> {
  try {
    await NativeModules.StorageModule.writeFile(
      CACHE_FILE,
      JSON.stringify({ rates: store.rates, bkamMap: store.bkamMap, fetchedAt: store.fetchedAt })
    );
  } catch (_) { /* échec silencieux */ }
}

async function loadOverrides(): Promise<OverrideMap> {
  try {
    await NativeModules.StorageModule.initFolder(FOLDER_NAME);
    const raw: string = await NativeModules.StorageModule.readFile(OVERRIDES_FILE);
    return JSON.parse(raw) || {};
  } catch (_) { return {}; }
}

async function refresh(): Promise<void> {
  const [bcResult, bkamResult] = await Promise.allSettled([
    fetchTableauChangeRates(),
    fetchBkamMapParallel(),
  ]);

  const newRates = bcResult.status === 'fulfilled' ? bcResult.value : null;
  const newBkam  = bkamResult.status === 'fulfilled' && Object.keys(bkamResult.value).length > 0
    ? bkamResult.value
    : null;

  if (!newRates && !store.rates.length) return;

  const bcRates  = newRates || store.rates.map(r => ({ code: r.code, label: r.label, unit: r.unit, buy: r.buy, sell: r.sell, icon: r.icon }));
  const bkamMap  = newBkam || store.bkamMap;
  const overrides = await loadOverrides();

  store.rates    = mergeRates(bcRates, bkamMap, overrides);
  store.bkamMap  = bkamMap;
  store.fetchedAt = Date.now();
  store.isStale  = !newRates || !newBkam;
  store.isReady  = true;

  notify();
  saveCache();
}

export function refreshCombinedStore(): void {
  if (initialized) refresh();
}

export function initCombinedStore(): void {
  if (initialized) {
    if (store.isReady) notify();
    return;
  }
  initialized = true;

  // initFolder est idempotent — garantit l'autonomie du widget même sans App.tsx
  NativeModules.StorageModule.initFolder(FOLDER_NAME)
    .catch(() => {})
    .finally(() => {
      loadCache().then(() => { refresh(); });
    });

  setInterval(refresh, REFRESH_MS);
}

export function getCombinedState(): Pick<StoreState, 'rates' | 'isStale' | 'isReady'> {
  return { rates: store.rates, isStale: store.isStale, isReady: store.isReady };
}

export function subscribeCombinedStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
