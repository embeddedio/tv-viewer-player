import { useState } from 'react';

export default function SelectionBar({ count, folders, currentFolder, onMove, onDelete, onClear }) {
  const [menu, setMenu] = useState(false);
  const targets = folders.filter(f => f !== currentFolder);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-accent/10">
      <span className="text-sm font-semibold text-text">{count} sélectionné(s)</span>

      <div className="relative">
        <button
          onClick={() => setMenu(m => !m)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg text-text hover:border-accent transition"
        >
          Déplacer vers ▾
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute z-20 mt-1 w-52 max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-card py-1">
              {currentFolder !== null && (
                <button
                  onClick={() => { onMove(null); setMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-text-muted hover:bg-white/5 hover:text-text"
                >
                  🏠 Racine
                </button>
              )}
              {targets.map(f => (
                <button
                  key={f}
                  onClick={() => { onMove(f); setMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-text-muted hover:bg-white/5 hover:text-text truncate"
                >
                  📁 {f}
                </button>
              ))}
              {targets.length === 0 && currentFolder === null && (
                <div className="px-3 py-1.5 text-xs text-text-dim">Aucun autre dossier</div>
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={onDelete}
        className="px-3 py-1.5 text-sm bg-red/15 text-red border border-red/30 rounded-lg hover:bg-red/25 transition"
      >
        Supprimer
      </button>
      <button onClick={onClear} className="ml-auto text-sm text-text-dim hover:text-text transition">
        Effacer
      </button>
    </div>
  );
}
