const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { Mutex, safeWriteFile } = require('./utils');
const { sendToApp } = require('./bridge');

const getSequencesPath = () => {
  const { metadataDir } = require('./config');
  return path.join(metadataDir, 'sequences.json');
};
const sequencesLock = new Mutex();

// In-memory cache
let sequences = [];
let continueLoopState = {
  signature: '',
  index: 0,
  startedAtMs: 0,
};

const loadSequencesSync = () => {
  const p = getSequencesPath();
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    console.error('[sequences] loadSequencesSync: not an array at', p, typeof parsed);
  } catch (e) {
    console.error('[sequences] loadSequencesSync failed:', e.code, e.message, 'path:', p);
  }
  return [];
};

const loadSequencesAsync = async () => {
  try {
    const raw = await fsPromises.readFile(getSequencesPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return [];
};

const persistSequencesAsync = async (data) => {
  const release = await sequencesLock.lock();
  try {
    const seqPath = getSequencesPath();
    fs.mkdirSync(path.dirname(seqPath), { recursive: true });
    await safeWriteFile(seqPath, JSON.stringify(data, null, 2));
  } finally {
    release();
  }
};

const initSequences = () => {
  sequences = loadSequencesSync();
  // Backfill loop order/duration for legacy data.
  let changed = false;
  let nextOrder = getNextLoopOrder();
  sequences = sequences.map((seq) => {
    const updated = { ...seq };
    if (!Number.isFinite(Number(updated.loopDurationSec)) || Number(updated.loopDurationSec) < 1) {
      updated.loopDurationSec = 10;
      changed = true;
    }
    if (!Number.isFinite(Number(updated.loopOrder)) || Number(updated.loopOrder) < 0) {
      updated.loopOrder = nextOrder;
      nextOrder += 1;
      changed = true;
    }
    return updated;
  });
  if (changed) {
    const p = getSequencesPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    safeWriteFile(p, JSON.stringify(sequences, null, 2)).catch(() => {});
  }
};

const generateId = () => {
  return `seq-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
};

const parsePositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
};

const getDurationSeconds = (seq) => {
  const sec = parsePositiveInt(seq?.loopDurationSec, 0);
  return Math.max(1, sec || 10);
};

const getNextLoopOrder = () => {
  const maxOrder = sequences.reduce((max, seq) => {
    const order = parsePositiveInt(seq?.loopOrder, -1);
    return Math.max(max, order);
  }, -1);
  return maxOrder + 1;
};

const sortContinueSequences = (list) => (
  [...list].sort((a, b) => {
    const orderA = parsePositiveInt(a.loopOrder, Number.MAX_SAFE_INTEGER);
    const orderB = parsePositiveInt(b.loopOrder, Number.MAX_SAFE_INTEGER);
    if (orderA !== orderB) return orderA - orderB;
    return (a.createdAt || 0) - (b.createdAt || 0);
  })
);

const getContinueSignature = (list) => (
  list.map(seq => `${seq.id}:${parsePositiveInt(seq.loopOrder, 0)}:${getDurationSeconds(seq)}`).join('|')
);

const sanitizeSequence = (input, existing = null) => {
  const now = Date.now();
  const seq = {};
  seq.id = existing ? existing.id : (input.id || generateId());
  seq.name = typeof input.name === 'string' ? input.name.trim() : (existing?.name ?? '');
  seq.priority = Number.isFinite(Number(input.priority)) ? Math.max(0, Math.min(100, Math.trunc(Number(input.priority)))) : (existing?.priority ?? 10);
  seq.scheduleType = ['continue', 'custom'].includes(input.scheduleType) ? input.scheduleType : (existing?.scheduleType || 'continue');
  seq.startDate = typeof input.startDate === 'string' ? input.startDate : (existing?.startDate || '');
  seq.endDate = typeof input.endDate === 'string' ? input.endDate : (existing?.endDate || '');
  seq.startTime = typeof input.startTime === 'string' ? input.startTime : (existing?.startTime ?? '');
  seq.endTime = typeof input.endTime === 'string' ? input.endTime : (existing?.endTime ?? '');
  seq.days = Array.isArray(input.days) ? input.days.filter(d => typeof d === 'string') : (existing?.days || []);
  seq.loopDurationSec = parsePositiveInt(input.loopDurationSec, parsePositiveInt(existing?.loopDurationSec, 10)) || 10;
  seq.loopOrder = parsePositiveInt(input.loopOrder, parsePositiveInt(existing?.loopOrder, 0));
  seq.layoutId = typeof input.layoutId === 'string' && input.layoutId ? input.layoutId : (existing?.layoutId || 'fullscreen');
  if (input.customLayout === null || input.customLayout === undefined) {
    seq.customLayout = (input.customLayout === null) ? null : (existing?.customLayout || null);
  } else if (typeof input.customLayout === 'object') {
    seq.customLayout = input.customLayout;
  } else {
    seq.customLayout = existing?.customLayout || null;
  }
  seq.zones = (input.zones && typeof input.zones === 'object') ? input.zones : (existing?.zones || { zone1: { type: 'playlist', items: [] } });
  seq.createdAt = existing ? existing.createdAt : now;
  seq.updatedAt = now;
  return seq;
};

// CRUD
const getAll = () => sequences.slice();

const getById = (id) => sequences.find(s => s.id === id) || null;

const create = async (input) => {
  const seq = sanitizeSequence(input);
  if (!Number.isFinite(Number(input?.loopOrder))) {
    seq.loopOrder = getNextLoopOrder();
  }
  await persistSequencesAsync([...sequences, seq]);
  sequences.push(seq);
  sendToApp('sequences-updated');
  sendToApp('display-schedule-updated');
  return seq;
};

const update = async (id, input) => {
  const index = sequences.findIndex(s => s.id === id);
  if (index === -1) return null;
  const existing = sequences[index];
  const updated = sanitizeSequence(input, existing);
  const next = [...sequences];
  next[index] = updated;
  await persistSequencesAsync(next);
  sequences[index] = updated;
  sendToApp('sequences-updated');
  sendToApp('display-schedule-updated');
  return updated;
};

const remove = async (id) => {
  const index = sequences.findIndex(s => s.id === id);
  if (index === -1) return false;
  const next = sequences.filter((_, i) => i !== index);
  await persistSequencesAsync(next);
  sequences.splice(index, 1);
  sendToApp('sequences-updated');
  sendToApp('display-schedule-updated');
  return true;
};

const setAll = async (newSequences) => {
  sequences = newSequences;
  await persistSequencesAsync(sequences);
};

/**
 * Resolve which sequence is currently active based on date, day, time, and priority.
 */
const resolveActiveSequence = (defaultSequenceId) => {
  const now = new Date();
  const nowMs = now.getTime();
  const currentDate = now.toISOString().slice(0, 10);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);

  const customMatching = sequences.filter(seq => {
    if (seq.scheduleType !== 'custom') return false;
    if (seq.startTime && currentTime < seq.startTime) return false;
    if (seq.endTime && currentTime > seq.endTime) return false;
    if (seq.startDate && currentDate < seq.startDate) return false;
    if (seq.endDate && currentDate > seq.endDate) return false;
    if (!Array.isArray(seq.days) || seq.days.length === 0) return true;
    return seq.days.includes(currentDay);
  });

  if (customMatching.length > 0) {
    customMatching.sort((a, b) => {
      const dateA = a.startDate || '';
      const dateB = b.startDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return customMatching[0];
  }

  const continueSequences = sortContinueSequences(sequences.filter(seq => seq.scheduleType === 'continue'));
  if (continueSequences.length > 0) {
    const signature = getContinueSignature(continueSequences);
    if (continueLoopState.signature !== signature) {
      continueLoopState = { signature, index: 0, startedAtMs: nowMs };
    } else if (!continueLoopState.startedAtMs) {
      continueLoopState.startedAtMs = nowMs;
    }

    let guard = continueSequences.length + 2;
    while (guard > 0) {
      const currentSeq = continueSequences[continueLoopState.index % continueSequences.length];
      const durationMs = getDurationSeconds(currentSeq) * 1000;
      if (nowMs - continueLoopState.startedAtMs < durationMs) {
        return currentSeq;
      }
      continueLoopState.startedAtMs += durationMs;
      continueLoopState.index = (continueLoopState.index + 1) % continueSequences.length;
      guard -= 1;
    }

    return continueSequences[continueLoopState.index % continueSequences.length];
  }

  if (defaultSequenceId) {
    return sequences.find(s => s.id === defaultSequenceId) || null;
  }
  return null;
};

module.exports = {
  initSequences,
  getAll,
  getById,
  create,
  update,
  remove,
  setAll,
  resolveActiveSequence,
  generateId,
  sanitizeSequence,
};
