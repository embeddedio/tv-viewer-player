import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';

const BASE = window.location.origin;

const ROTATION_FIX = {
  'landscape-left':  'rotate(0deg)',
  'landscape-right': 'rotate(180deg)',
  'portrait-up':     'rotate(90deg)',
  'portrait-down':   'rotate(-90deg)',
};

async function requestCapture(sequenceId) {
  const url = sequenceId
    ? `${BASE}/api/preview/sequence`
    : `${BASE}/api/preview/request`;
  const body = sequenceId ? JSON.stringify({ sequenceId }) : undefined;
  const r = await fetch(url, {
    method: 'POST',
    headers: sequenceId ? { 'Content-Type': 'application/json' } : {},
    body,
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
  return { image: data.image, rotation: data.rotation || 'landscape-left' };
}

export default function LivePreviewModal({ onClose, sequenceId, sequenceName }) {
  const [image, setImage] = useState(null);
  const [rotation, setRotation] = useState('landscape-left');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSequencePreview = Boolean(sequenceId);
  const loadingLabel = isSequencePreview
    ? 'Prévisualisation sur TV... (jusqu\'à 12s)'
    : 'Capture en cours... (jusqu\'à 10s)';

  const fetchCapture = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImage(null);
    try {
      const { image: img, rotation: rot } = await requestCapture(sequenceId);
      setImage(img);
      setRotation(rot);
    } catch (e) {
      setError(`Erreur : ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [sequenceId]);

  useEffect(() => { fetchCapture(); }, [fetchCapture]);

  const title = isSequencePreview
    ? `📷 Preview — ${sequenceName || sequenceId}`
    : '📺 Aperçu Live TV';

  return (
    <Modal onClose={onClose} maxWidth="900px">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-text">{title}</h2>
          <button
            onClick={fetchCapture}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold bg-accent hover:bg-accent/80
                       text-white rounded-lg disabled:opacity-40 transition"
          >
            {loading ? 'Capture...' : '↻ Actualiser'}
          </button>
        </div>

        {isSequencePreview && !image && !error && (
          <p className="text-xs text-text-dim text-center">
            La séquence s'affiche sur le TV pendant ~10s, puis la planification reprend automatiquement.
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center h-48 text-text-dim gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/20 rounded-full border-t-accent animate-spin" />
            {loadingLabel}
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm text-center py-10 px-4">{error}</div>
        )}

        {image && (
          <img
            src={image}
            alt="Aperçu TV"
            className="w-full rounded-xl border border-border"
            style={{ transform: ROTATION_FIX[rotation] || 'rotate(0deg)' }}
          />
        )}
      </div>
    </Modal>
  );
}
