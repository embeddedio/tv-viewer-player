import { uploadsUrl } from '../../api';
import { getFileType, formatSize } from '../../utils';

const typeBadge = {
  image: 'bg-purple-500/20 text-purple-400',
  video: 'bg-blue-500/20 text-blue-400',
  audio: 'bg-yellow/20 text-yellow',
  autre: 'bg-white/10 text-text-dim',
};

function Thumb({ file, type }) {
  if (type === 'image') {
    return <img src={uploadsUrl(file.name)} loading="lazy" className="w-full h-full object-cover" />;
  }
  const glyph = type === 'video' ? '▶' : type === 'audio' ? '♫' : '📄';
  return <span className="text-2xl text-text-dim">{glyph}</span>;
}

export default function MediaCard({ file, view, selected, anySelected, onToggle, onDelete, onDragStart }) {
  const type = getFileType(file.name);
  const name = file.originalName || file.name;

  if (view === 'list') {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onClick={() => onToggle(file.name)}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${
          selected ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-white/[0.03]'
        }`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(file.name)}
          onClick={e => e.stopPropagation()}
          className="accent-accent w-4 h-4 shrink-0"
        />
        <div className="w-12 h-9 rounded bg-black/30 flex items-center justify-center overflow-hidden shrink-0">
          <Thumb file={file} type={type} />
        </div>
        <span className="flex-1 text-sm text-text truncate" title={name}>{name}</span>
        <span className={`px-2 py-0.5 rounded text-[0.65rem] font-semibold ${typeBadge[type]}`}>{type}</span>
        <span className="text-xs text-text-dim w-20 text-right tabular-nums">{formatSize(file.size)}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(file.name); }}
          title="Supprimer"
          className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red transition px-1"
        >
          {'🗑️'}
        </button>
      </div>
    );
  }

  // grille
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onToggle(file.name)}
      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition bg-card ${
        selected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-border-hover'
      }`}
    >
      <div className="relative aspect-video bg-black/30 flex items-center justify-center overflow-hidden">
        <Thumb file={file} type={type} />
        <button
          onClick={e => { e.stopPropagation(); onToggle(file.name); }}
          title="Sélectionner"
          className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center text-[11px] leading-none transition ${
            selected
              ? 'bg-accent border-accent text-white'
              : 'bg-black/40 border-white/40 text-transparent group-hover:text-white/70'
          } ${anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {'✓'}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(file.name); }}
          title="Supprimer"
          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/50 text-white/80 hover:bg-red hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
        >
          {'🗑️'}
        </button>
        <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold ${typeBadge[type]}`}>{type}</span>
      </div>
      <div className="p-2">
        <div className="text-xs text-text truncate" title={name}>{name}</div>
        <div className="text-[0.65rem] text-text-dim mt-0.5 tabular-nums">{formatSize(file.size)}</div>
      </div>
    </div>
  );
}
