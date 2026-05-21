import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import { showAlert } from '../../components/ui/Alert';
import { getFileType, formatSize } from '../../utils';
import MediaThumb from '../../components/shared/MediaThumb';
import FolderModal from './FolderModal';
import ImportModal from './ImportModal';

const badgeClass = (type) => {
  if (type === 'image') return 'bg-purple-500/20 text-purple-400';
  if (type === 'video') return 'bg-blue-500/20 text-blue-400';
  return 'bg-yellow/20 text-yellow';
};

// Fichier racine : thumbnail dans la 1re colonne (flush left)
// Fichier de dossier : 1re colonne vide + nom indenté dans la 2e
function FileRow({ f, indent, onDelete }) {
  const type = getFileType(f.name);
  return (
    <tr
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', f.name); e.dataTransfer.effectAllowed = 'move'; }}
      className="hover:bg-white/[0.02] cursor-grab active:cursor-grabbing"
    >
      {indent ? (
        <td className="border-b border-border w-[60px]" />
      ) : (
        <td className="p-3 border-b border-border w-[60px]">
          <MediaThumb file={f} />
        </td>
      )}
      <td className={`p-3 border-b border-border ${indent ? 'pl-8' : ''}`}>
        {indent ? (
          <div className="flex items-center gap-3">
            <MediaThumb file={f} />
            <span className="text-sm" title={f.name}>{f.originalName || f.name}</span>
          </div>
        ) : (
          <span className="text-sm" title={f.name}>{f.originalName || f.name}</span>
        )}
      </td>
      <td className="p-3 border-b border-border">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeClass(type)}`}>{type}</span>
      </td>
      <td className="p-3 border-b border-border text-sm text-text-dim">{formatSize(f.size)}</td>
      <td className="p-3 border-b border-border">
        <button
          onClick={() => onDelete(f.name)}
          className="px-3 py-1.5 bg-red text-white text-xs font-semibold rounded-lg hover:bg-red/80"
        >
          Supprimer
        </button>
      </td>
    </tr>
  );
}

function FolderRow({ name, files, expanded, onToggle, onRenameClick, onDelete, onFileDrop, onFileDelete }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <>
      <tr
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const fn = e.dataTransfer.getData('text/plain'); if (fn) onFileDrop(fn, name); }}
        className={`select-none transition-colors ${dragOver ? 'bg-accent/10' : 'bg-white/[0.025]'}`}
      >
        <td className="p-3 border-b border-border w-[60px]">
          <button
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center rounded border border-border hover:border-accent text-text-muted hover:text-accent font-bold text-base transition"
          >
            {expanded ? '−' : '+'}
          </button>
        </td>
        <td className="p-3 border-b border-border" colSpan={2}>
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">📁</span>
            <span className="text-sm font-semibold text-text">{name}</span>
            <span className="text-xs text-text-dim">({files.length})</span>
            {dragOver && <span className="text-xs text-accent font-medium">→ Déposer ici</span>}
          </div>
        </td>
        <td className="p-3 border-b border-border text-sm text-text-dim">dossier</td>
        <td className="p-3 border-b border-border">
          <div className="flex gap-1.5">
            <button
              onClick={() => onRenameClick(name)}
              title="Renommer"
              className="px-2 py-1 text-xs border border-border rounded hover:border-text-dim text-text-dim hover:text-text transition"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(name)}
              title="Supprimer le dossier"
              className="px-2 py-1 text-xs border border-border rounded hover:border-red/50 text-text-dim hover:text-red transition"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
      {expanded && files.map(f => (
        <FileRow key={f.name} f={f} indent onDelete={onFileDelete} />
      ))}
    </>
  );
}

export default function MediaTable() {
  const { mediaFiles, folders, reloadMedia, reloadFolders } = useApp();
  const [expanded, setExpanded] = useState(new Set());
  const [folderModal, setFolderModal] = useState(null); // null | { mode, oldName? }
  const [showImport, setShowImport] = useState(false);

  const allFiles = mediaFiles.filter(f => f.category !== 'logo');
  const rootFiles = allFiles.filter(f => !f.folder);
  const folderFiles = (name) => allFiles.filter(f => f.folder === name);

  const toggle = (name) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const handleDelete = async (filename) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    await api('/delete', { method: 'POST', body: JSON.stringify({ filename }) });
    await reloadMedia();
    showAlert('Fichier supprimé');
  };

  const handleFileDrop = async (filename, targetFolder) => {
    const r = await api('/files/move', { method: 'POST', body: JSON.stringify({ filename, folder: targetFolder }) });
    if (r?.success) reloadMedia();
    else showAlert(r?.message || 'Erreur déplacement', 'error');
  };

  const handleFolderConfirm = async (name) => {
    if (folderModal?.mode === 'create') {
      const r = await api('/folders/create', { method: 'POST', body: JSON.stringify({ name }) });
      if (r?.success) { await reloadFolders(); setExpanded(prev => new Set([...prev, name])); }
      else showAlert(r?.message || 'Erreur création dossier', 'error');
    } else if (folderModal?.mode === 'rename') {
      const r = await api('/folders/rename', { method: 'POST', body: JSON.stringify({ oldName: folderModal.oldName, newName: name }) });
      if (r?.success) { reloadFolders(); reloadMedia(); }
      else showAlert(r?.message || 'Erreur renommage dossier', 'error');
    }
    setFolderModal(null);
  };

  const handleDeleteFolder = async (name) => {
    if (!confirm(`Supprimer le dossier "${name}" ? Les fichiers seront déplacés à la racine.`)) return;
    const r = await api('/folders/delete', { method: 'POST', body: JSON.stringify({ name }) });
    if (r?.success) { reloadFolders(); reloadMedia(); }
    else showAlert(r?.message || 'Erreur suppression dossier', 'error');
  };

  const isEmpty = folders.length === 0 && allFiles.length === 0;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/[0.01]">
              <th className="p-3 border-b border-border w-[60px]" />
              <th className="p-3 text-left text-text-muted font-semibold text-xs uppercase tracking-wider border-b border-border">Nom</th>
              <th className="p-3 text-left text-text-muted font-semibold text-xs uppercase tracking-wider border-b border-border">Type</th>
              <th className="p-3 text-left text-text-muted font-semibold text-xs uppercase tracking-wider border-b border-border">Taille</th>
              <th className="p-3 border-b border-border">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setFolderModal({ mode: 'create' })}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border border-border rounded-lg hover:border-accent hover:text-accent text-text-dim transition"
                  >
                    📁 Nouveau dossier
                  </button>
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent/80 text-white rounded-lg transition"
                  >
                    ⬆ Importer
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {folders.map(name => (
              <FolderRow
                key={name}
                name={name}
                files={folderFiles(name)}
                expanded={expanded.has(name)}
                onToggle={() => toggle(name)}
                onRenameClick={(n) => setFolderModal({ mode: 'rename', oldName: n })}
                onDelete={handleDeleteFolder}
                onFileDrop={handleFileDrop}
                onFileDelete={handleDelete}
              />
            ))}
            {rootFiles.map(f => (
              <FileRow key={f.name} f={f} indent={false} onDelete={handleDelete} />
            ))}
            {isEmpty && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-text-dim">
                  Aucun média importé — utilisez le bouton <strong>Importer</strong> ci-dessus
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          folders={folders}
          onClose={() => setShowImport(false)}
          onImported={reloadMedia}
        />
      )}
    </>
  );
}
