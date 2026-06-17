import { useState } from 'react';

function RailItem({ label, icon, count, active, onClick, onDrop, onRename, onDelete }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop?.(e); }}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition ${
        active ? 'bg-accent/15 text-accent font-semibold' : 'text-text-muted hover:bg-white/[0.04] hover:text-text'
      } ${over ? 'ring-1 ring-accent bg-accent/10' : ''}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 truncate" title={label}>{label}</span>
      {(onRename || onDelete) && (
        <span className="hidden group-hover:flex items-center gap-1.5">
          {onRename && (
            <button onClick={e => { e.stopPropagation(); onRename(); }} title="Renommer" className="text-text-dim hover:text-text">✏️</button>
          )}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Supprimer" className="text-text-dim hover:text-red">🗑️</button>
          )}
        </span>
      )}
      <span className="text-xs text-text-dim tabular-nums group-hover:hidden">{count}</span>
    </div>
  );
}

export default function FolderRail({
  folders, counts, rootCount, current,
  onSelect, onDropToFolder, onNewFolder, onRenameFolder, onDeleteFolder,
}) {
  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border bg-card2/40 p-2 flex flex-col gap-1 overflow-y-auto max-md:max-h-48">
      <div className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-text-dim">Dossiers</div>
      <RailItem
        label="Racine" icon="🏠" count={rootCount}
        active={current === null} onClick={() => onSelect(null)}
        onDrop={e => onDropToFolder(e, null)}
      />
      {folders.map(name => (
        <RailItem
          key={name} label={name} icon="📁" count={counts[name] || 0}
          active={current === name} onClick={() => onSelect(name)}
          onDrop={e => onDropToFolder(e, name)}
          onRename={() => onRenameFolder(name)}
          onDelete={() => onDeleteFolder(name)}
        />
      ))}
      <button
        onClick={onNewFolder}
        className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-dim border border-dashed border-border hover:border-accent hover:text-accent transition"
      >
        <span className="text-base leading-none">＋</span> Nouveau dossier
      </button>
    </aside>
  );
}
