import { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api, uploadFiles } from '../../api';
import { showAlert } from '../../components/ui/Alert';
import FolderRail from './FolderRail';
import MediaToolbar from './MediaToolbar';
import MediaGrid from './MediaGrid';
import SelectionBar from './SelectionBar';
import FolderModal from './FolderModal';
import ImportModal from './ImportModal';

export default function MediaExplorer() {
  const { mediaFiles, folders, reloadMedia, reloadFolders } = useApp();

  const [currentFolder, setCurrentFolder] = useState(null);     // null = racine
  const [selected, setSelected] = useState(new Set());          // Set<filename>
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('admin-media-view') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  const [search, setSearch] = useState('');
  const [folderModal, setFolderModal] = useState(null);         // null | { mode, oldName? }
  const [showImport, setShowImport] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const dragItems = useRef([]);     // fichiers en cours de drag interne
  const fileInputRef = useRef(null);

  useEffect(() => { try { localStorage.setItem('admin-media-view', view); } catch {} }, [view]);

  const allFiles = useMemo(() => mediaFiles.filter(f => f.category !== 'logo'), [mediaFiles]);
  const counts = useMemo(() => {
    const c = {};
    for (const f of allFiles) if (f.folder) c[f.folder] = (c[f.folder] || 0) + 1;
    return c;
  }, [allFiles]);
  const rootCount = useMemo(() => allFiles.filter(f => !f.folder).length, [allFiles]);

  const visible = useMemo(() => {
    let list = currentFolder === null
      ? allFiles.filter(f => !f.folder)
      : allFiles.filter(f => f.folder === currentFolder);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(f => (f.originalName || f.name).toLowerCase().includes(q));
    return list;
  }, [allFiles, currentFolder, search]);

  // Réinitialise la sélection quand on change de dossier
  useEffect(() => { setSelected(new Set()); }, [currentFolder]);

  const toggleSelect = (name) => setSelected(prev => {
    const n = new Set(prev);
    n.has(name) ? n.delete(name) : n.add(name);
    return n;
  });
  const clearSelection = () => setSelected(new Set());

  // ── Handlers API (contrats identiques à l'ancien MediaTable) ──
  const moveFiles = async (filenames, folder) => {
    for (const filename of filenames) {
      const r = await api('/files/move', { method: 'POST', body: JSON.stringify({ filename, folder }) });
      if (!r?.success) { showAlert(r?.message || 'Erreur déplacement', 'error'); break; }
    }
    await reloadMedia();
    clearSelection();
  };

  const deleteFile = async (filename) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    await api('/delete', { method: 'POST', body: JSON.stringify({ filename }) });
    await reloadMedia();
    setSelected(prev => { const n = new Set(prev); n.delete(filename); return n; });
    showAlert('Fichier supprimé');
  };

  const bulkDelete = async () => {
    const names = [...selected];
    if (!names.length) return;
    if (!confirm(`Supprimer ${names.length} fichier(s) ?`)) return;
    for (const filename of names) await api('/delete', { method: 'POST', body: JSON.stringify({ filename }) });
    await reloadMedia();
    clearSelection();
    showAlert(`${names.length} fichier(s) supprimé(s)`);
  };

  const handleFolderConfirm = async (name) => {
    if (folderModal?.mode === 'create') {
      const r = await api('/folders/create', { method: 'POST', body: JSON.stringify({ name }) });
      if (r?.success) { await reloadFolders(); setCurrentFolder(name); }
      else showAlert(r?.message || 'Erreur création dossier', 'error');
    } else if (folderModal?.mode === 'rename') {
      const r = await api('/folders/rename', { method: 'POST', body: JSON.stringify({ oldName: folderModal.oldName, newName: name }) });
      if (r?.success) { await reloadFolders(); await reloadMedia(); if (currentFolder === folderModal.oldName) setCurrentFolder(name); }
      else showAlert(r?.message || 'Erreur renommage dossier', 'error');
    }
    setFolderModal(null);
  };

  const deleteFolder = async (name) => {
    if (!confirm(`Supprimer le dossier "${name}" ? Les fichiers seront déplacés à la racine.`)) return;
    const r = await api('/folders/delete', { method: 'POST', body: JSON.stringify({ name }) });
    if (r?.success) { await reloadFolders(); await reloadMedia(); if (currentFolder === name) setCurrentFolder(null); }
    else showAlert(r?.message || 'Erreur suppression dossier', 'error');
  };

  // ── Drag interne : déplacement de fichiers ──
  const makeDragStart = (f) => (e) => {
    const items = selected.has(f.name) ? [...selected] : [f.name];
    dragItems.current = items;
    e.dataTransfer.setData('text/plain', items.join('\n'));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDropToFolder = (e, folder) => {
    const items = dragItems.current.length
      ? dragItems.current
      : (e.dataTransfer.getData('text/plain') || '').split('\n').filter(Boolean);
    dragItems.current = [];
    if (items.length) moveFiles(items, folder);
  };

  // ── Drag externe : upload de fichiers sur la grille ──
  const isExternal = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  const onZoneDragOver = (e) => { if (isExternal(e)) { e.preventDefault(); setDropActive(true); } };
  const onZoneDragLeave = (e) => {
    if (isExternal(e) && !e.currentTarget.contains(e.relatedTarget)) setDropActive(false);
  };
  const onZoneDrop = async (e) => {
    if (!isExternal(e)) return;
    e.preventDefault(); setDropActive(false);
    const r = await uploadFiles(e.dataTransfer.files, { category: 'media', folder: currentFolder });
    if (r?.success) reloadMedia();
  };
  const pickFiles = () => fileInputRef.current?.click();
  const onPicked = async (e) => {
    if (!e.target.files?.length) return;
    const r = await uploadFiles(e.target.files, { category: 'media', folder: currentFolder });
    if (r?.success) reloadMedia();
    e.target.value = '';
  };

  const anySelected = selected.size > 0;

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[480px] bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <FolderRail
        folders={folders} counts={counts} rootCount={rootCount} current={currentFolder}
        onSelect={setCurrentFolder} onDropToFolder={onDropToFolder}
        onNewFolder={() => setFolderModal({ mode: 'create' })}
        onRenameFolder={(n) => setFolderModal({ mode: 'rename', oldName: n })}
        onDeleteFolder={deleteFolder}
      />

      <div
        className="flex-1 min-w-0 flex flex-col"
        onDragOver={onZoneDragOver}
        onDragLeave={onZoneDragLeave}
        onDrop={onZoneDrop}
      >
        <MediaToolbar
          currentFolder={currentFolder} onNavigateRoot={() => setCurrentFolder(null)}
          search={search} onSearch={setSearch} view={view} onView={setView}
          onNewFolder={() => setFolderModal({ mode: 'create' })} onImport={() => setShowImport(true)}
          count={visible.length}
        />

        {anySelected && (
          <SelectionBar
            count={selected.size} folders={folders} currentFolder={currentFolder}
            onMove={(folder) => moveFiles([...selected], folder)}
            onDelete={bulkDelete} onClear={clearSelection}
          />
        )}

        <div className="relative flex-1 min-h-0 overflow-y-auto">
          <MediaGrid
            files={visible} view={view} selected={selected} anySelected={anySelected} search={search}
            onToggle={toggleSelect} onDelete={deleteFile} makeDragStart={makeDragStart}
            onPickFiles={pickFiles} dropActive={dropActive}
          />
          {dropActive && visible.length > 0 && (
            <div className="absolute inset-0 z-10 m-3 border-2 border-dashed border-accent rounded-2xl bg-accent/10 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-4xl text-accent mb-2">⬆</div>
                <p className="text-sm font-semibold text-text">
                  Déposer pour importer {currentFolder ? `dans 📁 ${currentFolder}` : 'à la racine'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*"
        className="hidden" onChange={onPicked}
      />

      {folderModal && (
        <FolderModal
          mode={folderModal.mode}
          initialValue={folderModal.mode === 'rename' ? folderModal.oldName : ''}
          onConfirm={handleFolderConfirm}
          onClose={() => setFolderModal(null)}
        />
      )}

      {showImport && (
        <ImportModal
          folders={folders} initialFolder={currentFolder}
          onClose={() => setShowImport(false)} onImported={reloadMedia}
        />
      )}
    </div>
  );
}
