import { useState, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { showAlert } from '../../components/ui/Alert';
import { installWidget } from '../../api';

export default function WidgetsInstallModal({ onClose, onInstalled }) {
  const [file, setFile] = useState(null);
  const [dragover, setDragover] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.zip')) {
      showAlert('Seuls les fichiers .zip sont acceptés', 'error');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleInstall = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const r = await installWidget(file);
      if (r?.success) {
        showAlert(`Widget "${r.widget?.label || file.name}" installé`);
        onInstalled();
        onClose();
      } else {
        showAlert(r?.message || "Erreur lors de l'installation", 'error');
      }
    } catch {
      showAlert("Erreur lors de l'installation", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="480px">
      <h3 className="text-base font-semibold mb-4 pr-6">Installer un widget</h3>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
          dragover ? 'border-accent bg-accent/10' : 'border-border hover:border-accent hover:bg-accent/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">📦</span>
            <span className="text-sm font-medium text-text">{file.name}</span>
            <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} Ko</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <span className="text-3xl">📂</span>
            <span className="text-sm">Glissez un fichier <strong className="text-text">.zip</strong> ici</span>
            <span className="text-xs">ou cliquez pour sélectionner</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Annuler</Button>
        <Button variant="primary" onClick={handleInstall} disabled={!file || loading}>
          {loading ? <><Spinner className="w-3.5 h-3.5" /> Installation...</> : 'Installer'}
        </Button>
      </div>
    </Modal>
  );
}
