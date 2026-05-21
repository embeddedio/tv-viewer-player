import { useState } from 'react';
import Modal from '../../components/ui/Modal';

export default function FolderModal({ mode, initialValue = '', onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue);
  const isCreate = mode === 'create';

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) { onConfirm(trimmed); onClose(); }
  };

  return (
    <Modal onClose={onClose} maxWidth="400px">
      <h2 className="text-base font-bold text-text mb-4">
        {isCreate ? '📁 Nouveau dossier' : '✏️ Renommer le dossier'}
      </h2>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onClose(); }}
        placeholder="Nom du dossier"
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent text-text mb-4"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-sm text-text-dim border border-border rounded-lg hover:text-text transition"
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={!value.trim()}
          className="px-4 py-1.5 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-40 transition"
        >
          {isCreate ? 'Créer' : 'Renommer'}
        </button>
      </div>
    </Modal>
  );
}
