import { useRef, useState } from 'react';
import Spinner from '../../components/ui/Spinner';
import { uploadFiles } from '../../api';
import { showAlert } from '../../components/ui/Alert';

export default function UploadZone({ onUploaded, folder = null }) {
  const inputRef = useRef(null);
  const [dragover, setDragover] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;

    setUploading(true);
    try {
      const r = await uploadFiles(list, { category: 'media', folder });
      if (r?.success) {
        showAlert(`${list.length} fichier(s) uploade(s)`);
        onUploaded();
      } else {
        showAlert(r?.message || "Erreur lors de l'envoi", 'error');
      }
    } catch {
      showAlert("Erreur lors de l'envoi", 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-5 ${
        dragover   ? 'border-accent bg-accent/5' :
        uploading  ? 'border-border/50 opacity-60 cursor-not-allowed' :
        'border-border hover:border-accent hover:bg-accent/5'
      }`}
    >
      {uploading ? (
        <div className="flex items-center justify-center gap-3 text-text-muted text-sm">
          <Spinner />
          <span>Envoi en cours...</span>
        </div>
      ) : (
        <>
          <div className="text-3xl text-text-dim">&#8686;</div>
          <p className="text-text-muted mt-2 text-[0.9rem]">
            Glissez vos fichiers ici ou <strong>cliquez pour parcourir</strong>
          </p>
          <p className="text-xs text-text-dim mt-1">(Images, Videos, Audio - max 60MB)</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={e => { if (e.target.files?.length) upload(e.target.files); }}
      />
    </div>
  );
}
