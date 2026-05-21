import { useState, useEffect, useRef } from 'react';

export default function LayoutEditorZone({
  index, zoneId, path, flex, color, canRemove, pctLabel, pctValue,
  onSplit, onRemove, onPctChange,
}) {
  const num = parseInt((zoneId || '').replace('zone', '')) || (index + 1);
  const [localPct, setLocalPct] = useState(String(pctValue));
  const inputRef = useRef(null);

  // Sync from parent when pctValue changes (but not while user is typing)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalPct(String(pctValue));
    }
  }, [pctValue]);

  const commitValue = () => {
    const parsed = parseInt(localPct, 10);
    if (!Number.isFinite(parsed)) {
      setLocalPct(String(pctValue));
      return;
    }
    const clamped = Math.max(5, Math.min(95, parsed));
    setLocalPct(String(clamped));
    onPctChange(path, clamped);
  };

  return (
    <div
      className="flex items-center justify-center text-sm font-semibold text-white/80 select-none relative group"
      style={{ flex, background: color, minWidth: 20, minHeight: 20 }}
    >
      <span>Zone {num}</span>

      {pctLabel && (
        <>
          <span className="absolute top-1.5 right-[54px] text-[0.6rem] text-white/50 z-[2]">
            {pctLabel}%
          </span>
          <input
            ref={inputRef}
            type="number"
            min={5}
            max={95}
            value={localPct}
            onChange={e => setLocalPct(e.target.value)}
            onBlur={commitValue}
            onKeyDown={e => { if (e.key === 'Enter') commitValue(); }}
            className="absolute top-1 right-1 w-12 px-1 py-0.5 bg-black/50 border border-white/20 rounded text-text text-[0.7rem] text-center z-[2] focus:outline-none focus:border-accent"
            title={`${pctLabel === 'W' ? 'Largeur' : 'Hauteur'} %`}
          />
        </>
      )}

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSplit(path, 'row')}
          className="bg-black/60 border-none text-text text-base cursor-pointer rounded w-[30px] h-[30px] flex items-center justify-center hover:bg-accent/50"
          title="Diviser en colonnes"
        >
          &#8596;
        </button>
        <button
          onClick={() => onSplit(path, 'column')}
          className="bg-black/60 border-none text-text text-base cursor-pointer rounded w-[30px] h-[30px] flex items-center justify-center hover:bg-accent/50"
          title="Diviser en lignes"
        >
          &#8597;
        </button>
        {canRemove && (
          <button
            onClick={() => onRemove(path)}
            className="bg-black/60 border-none text-text text-base cursor-pointer rounded w-[30px] h-[30px] flex items-center justify-center hover:bg-red/50"
            title="Supprimer"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
