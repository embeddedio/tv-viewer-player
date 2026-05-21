import { useState, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import { uploadFiles } from '../../api';
import { showAlert } from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';

export default function ImportModal({ folders, onClose, onImported }) {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...list.filter(f => !names.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const r = await uploadFiles(files, { category: 'media', folder: selectedFolder });
      if (r?.success) {
        showAlert(`${files.length} fichier(s) importé(s)`);
        onImported();
        onClose();
      } else {
        showAlert(r?.message || "Erreur lors de l'envoi", 'error');
      }
    } catch {
      showAlert("Erreur lors de l'envoi", 'error');
    } finally {
      setUploading(false);
    }
  };

  const folderLabel = selectedFolder ? `📁 ${selectedFolder}` : '🏠 Racine';

  return (
    <Modal onClose={onClose} maxWidth="520px">
      <h2 className="text-base font-bold text-text mb-4">⬆ Importer des fichiers</h2>

      {/* Sélection dossier */}
      <p className="text-xs text-text-dim mb-2 uppercase tracking-wide font-semibold">Destination</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Racine */}
        <button
          onClick={() => setSelectedFolder(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            selectedFolder === null
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-text-dim hover:border-text-dim hover:text-text'
          }`}
        >
          🏠 Racine
        </button>
        {folders.map(name => (
          <button
            key={name}
            onClick={() => setSelectedFolder(name)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              selectedFolder === name
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-dim hover:border-text-dim hover:text-text'
            }`}
          >
            📁 {name}
          </button>
        ))}
      </div>

      {/* Zone de drop / sélection fichiers */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4 ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
        }`}
      >
        <div className="text-2xl text-text-dim mb-1">⬆</div>
        <p className="text-sm text-text-muted">
          Glissez vos fichiers ici ou <strong className="text-text">cliquez pour parcourir</strong>
        </p>
        <p className="text-xs text-text-dim mt-1">Images, Vidéos, Audio</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={e => { if (e.target.files?.length) addFiles(e.target.files); }}
        />
      </div>

      {/* Liste des fichiers sélectionnés */}
      {files.length > 0 && (
        <ul className="mb-4 max-h-32 overflow-y-auto space-y-1">
          {files.map(f => (
            <li key={f.name} className="flex items-center justify-between text-xs text-text-dim bg-surface rounded px-2 py-1">
              <span className="truncate">{f.name}</span>
              <button onClick={() => removeFile(f.name)} className="ml-2 hover:text-red shrink-0">✕</button>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-dim">
          {files.length > 0 ? `${files.length} fichier(s) → ${folderLabel}` : 'Aucun fichier sélectionné'}
        </span>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-text-dim border border-border rounded-lg hover:text-text transition">
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={!files.length || uploading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-40 transition"
          >
            {uploading ? <Spinner className="w-3 h-3" /> : null}
            {uploading ? 'Envoi...' : 'Importer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
