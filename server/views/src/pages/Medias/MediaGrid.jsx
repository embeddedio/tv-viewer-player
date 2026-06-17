import MediaCard from './MediaCard';

export default function MediaGrid({
  files, view, selected, anySelected, search,
  onToggle, onDelete, makeDragStart, onPickFiles, dropActive,
}) {
  // État vide → grande zone de dépôt (ou message de recherche sans résultat)
  if (files.length === 0) {
    if (search.trim()) {
      return (
        <div className="m-4 flex-1 min-h-[200px] flex items-center justify-center text-center text-text-dim text-sm">
          Aucun média ne correspond à « {search.trim()} »
        </div>
      );
    }
    return (
      <div
        onClick={onPickFiles}
        className={`m-4 min-h-[260px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
          dropActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
        }`}
      >
        <div className="text-4xl text-text-dim mb-2">⬆</div>
        <p className="text-sm text-text-muted">
          Glissez vos fichiers ici ou <strong className="text-text">cliquez pour parcourir</strong>
        </p>
        <p className="text-xs text-text-dim mt-1">Images, Vidéos, Audio — max 60 Mo</p>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="p-3 flex flex-col gap-0.5">
        {files.map(f => (
          <MediaCard
            key={f.name} file={f} view="list"
            selected={selected.has(f.name)} anySelected={anySelected}
            onToggle={onToggle} onDelete={onDelete} onDragStart={makeDragStart(f)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map(f => (
        <MediaCard
          key={f.name} file={f} view="grid"
          selected={selected.has(f.name)} anySelected={anySelected}
          onToggle={onToggle} onDelete={onDelete} onDragStart={makeDragStart(f)}
        />
      ))}
    </div>
  );
}
