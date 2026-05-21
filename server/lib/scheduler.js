const { resolveActiveSequence } = require('./sequences');
const { LAYOUT_TEMPLATES } = require('./layouts');

/**
 * Resolve the active display configuration.
 * Uses the new sequences system with date-range, custom days, hours.
 * Falls back to defaultSequenceId from config, then to fullscreen playlist.
 */
const resolveActiveDisplay = (defaultSequenceId) => {
  const seq = resolveActiveSequence(defaultSequenceId);

  if (!seq) {
    return {
      sequenceId: null,
      sequenceName: null,
      layoutId: 'fullscreen',
      zones: { zone1: { type: 'playlist', items: [] } },
      customLayout: null,
    };
  }

  return {
    sequenceId: seq.id,
    sequenceName: seq.name,
    layoutId: seq.layoutId || 'fullscreen',
    zones: seq.zones || { zone1: { type: 'playlist', items: [] } },
    customLayout: seq.customLayout || null,
  };
};

module.exports = {
  resolveActiveDisplay,
};
