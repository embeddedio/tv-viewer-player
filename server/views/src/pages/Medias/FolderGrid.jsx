import { useState, useRef } from 'react';

function FolderCard({ name, count, onEnter, onRename, onDelete, onFileDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const inputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const filename = e.dataTransfer.getData('text/plain');
    if (filename) onFileDrop(filename, name);
  };

  const startRename = (e) => {
    e.stopPropagation();
    setRenameValue(name);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== name) onRename(name, trimmed);
    setRenaming(false);
  };

  return (
    <div
      onClick={() => !renaming && onEnter(name)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all select-none
        ${dragOver
          ? 'border-accent bg-accent/15 scale-105'
          : 'border-border hover:border-accent/50 hover:bg-white/[0.03]'
        }`}
    >
      <span className="text-4xl">📁</span>

      {renaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
          onClick={e => e.stopPropagation()}
          className="w-full text-center text-sm bg-surface border border-accent rounded px-1 py-0.5 outline-none text-text"
          autoFocus
        />
      ) : (
        <span className="text-sm font-medium text-text text-center break-all line-clamp-2">{name}</span>
      )}

      <span className="text-xs text-text-dim">{count} fichier{count !== 1 ? 's' : ''}</span>

      {!renaming && (
        <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1">
          <button
            onClick={startRename}
            title="Renommer"
            className="p-1 rounded text-text-dim hover:text-text hover:bg-white/10 text-xs"
          >
            ✏️
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(name); }}
            title="Supprimer le dossier"
            className="p-1 rounded text-text-dim hover:text-red hover:bg-red/10 text-xs"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}

export default function FolderGrid({ folders, mediaFiles, onEnter, onCreate, onDelete, onRename, onFileDrop }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const countInFolder = (name) => mediaFiles.filter(f => f.folder === name && f.category !== 'logo').length;

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (trimmed) { onCreate(trimmed); }
    setNewName('');
    setCreating(false);
  };

  if (folders.length === 0 && !creating) {
    return (
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-dashed border-border rounded-xl hover:border-accent hover:text-accent text-text-dim transition"
        >
          <span className="text-lg">📁</span> Nouveau dossier
        </button>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
        {folders.map(name => (
          <FolderCard
            key={name}
            name={name}
            count={countInFolder(name)}
            onEnter={onEnter}
            onRename={onRename}
            onDelete={onDelete}
            onFileDrop={onFileDrop}
          />
        ))}

        {creating ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-accent bg-accent/5">
            <span className="text-4xl">📁</span>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={() => { if (newName.trim()) handleCreate(); else setCreating(false); }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="Nom du dossier"
              className="w-full text-center text-sm bg-surface border border-accent rounded px-1 py-0.5 outline-none text-text placeholder:text-text-dim"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-accent hover:bg-accent/5 text-text-dim hover:text-accent transition cursor-pointer"
          >
            <span className="text-4xl leading-none">+</span>
            <span className="text-xs font-medium">Nouveau dossier</span>
          </button>
        )}
      </div>
    </div>
  );
}
