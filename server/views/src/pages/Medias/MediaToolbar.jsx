export default function MediaToolbar({
  currentFolder, onNavigateRoot,
  search, onSearch, view, onView, onNewFolder, onImport, count,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <button
          onClick={onNavigateRoot}
          className={`hover:text-text transition ${currentFolder ? 'text-text-muted' : 'text-text font-semibold'}`}
        >
          🏠 Racine
        </button>
        {currentFolder && (
          <>
            <span className="text-text-dim">/</span>
            <span className="text-text font-semibold truncate" title={currentFolder}>📁 {currentFolder}</span>
          </>
        )}
        <span className="text-xs text-text-dim ml-1">({count})</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Recherche */}
        <div className="relative">
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-36 md:w-52 bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-accent text-text placeholder:text-text-dim"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim text-sm pointer-events-none">🔍</span>
        </div>

        {/* Bascule grille / liste */}
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => onView('grid')}
            title="Grille"
            className={`px-2.5 py-1.5 text-sm transition ${view === 'grid' ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}`}
          >▦</button>
          <button
            onClick={() => onView('list')}
            title="Liste"
            className={`px-2.5 py-1.5 text-sm transition ${view === 'list' ? 'bg-accent text-white' : 'text-text-dim hover:text-text'}`}
          >≣</button>
        </div>

        <button
          onClick={onNewFolder}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-border rounded-lg text-text-muted hover:border-accent hover:text-accent transition"
        >
          ＋ Dossier
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-gradient-to-br from-accent to-accent2 text-white rounded-lg hover:shadow-[0_4px_14px_rgb(var(--color-accent)/0.35)] transition"
        >
          ⬆ Importer
        </button>
      </div>
    </div>
  );
}
