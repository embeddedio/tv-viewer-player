import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';
import DashSidebar from './DashSidebar';
import DashStats from './DashStats';
import AlertContainer from '../../components/ui/Alert';

const BASE = window.location.origin;

const ROTATION_FIX = {
  'landscape-left':  'none',
  'landscape-right': 'rotate(180deg)',
  'portrait-up':     'rotate(-90deg)',
  'portrait-down':   'rotate(90deg)',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { layouts, allSequences, reloadMedia, reloadSequences } = useApp();
  const [display, setDisplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeqId, setSelectedSeqId] = useState(null);

  // Capture TV
  const [captureImage, setCaptureImage] = useState(null);
  const [captureRotation, setCaptureRotation] = useState('landscape-left');
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [captureLabel, setCaptureLabel] = useState('');
  const abortRef = useRef(null);
  const timerRef = useRef(undefined);
  const previewRef = useRef(null);
  const [portraitScale, setPortraitScale] = useState(1);

  const loadDashboard = useCallback(async () => {
    const displayR = await api('/api/active-sequence');
    setDisplay(displayR);
    reloadMedia();
    reloadSequences();
    setLoading(false);
  }, [reloadMedia, reloadSequences]);

  useEffect(() => {
    loadDashboard();
    timerRef.current = setInterval(loadDashboard, 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadDashboard]);

  // Sélection initiale dans la sidebar (pour le highlight) — sans déclencher de capture
  useEffect(() => {
    if (selectedSeqId && allSequences.some(s => s.id === selectedSeqId)) return;
    if (display?.sequenceId && allSequences.some(s => s.id === display.sequenceId)) {
      setSelectedSeqId(display.sequenceId);
      return;
    }
    setSelectedSeqId(allSequences[0]?.id || null);
  }, [allSequences, display, selectedSeqId]);

  const requestCapture = useCallback(async (sequenceId, label) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCaptureLoading(true);
    setCaptureError(null);
    setCaptureLabel(label);

    try {
      const url = sequenceId
        ? `${BASE}/api/preview/sequence`
        : `${BASE}/api/preview/request`;
      const r = await fetch(url, {
        method: 'POST',
        headers: sequenceId ? { 'Content-Type': 'application/json' } : {},
        body: sequenceId ? JSON.stringify({ sequenceId }) : undefined,
        signal: controller.signal,
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
      setCaptureImage(data.image);
      setCaptureRotation(data.rotation || 'landscape-left');
    } catch (e) {
      if (e.name === 'AbortError') return;
      setCaptureError(`Erreur : ${e.message}`);
    } finally {
      setCaptureLoading(false);
    }
  }, []);

  // Capture live automatique au chargement
  useEffect(() => {
    if (!loading) requestCapture(null, 'Capture de l\'écran TV...');
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scale pour les modes portrait : l'image tournée ne doit pas dépasser le container
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPortraitScale(width > 0 ? height / width : 1);
  }, [captureImage, captureRotation]);

  const handleSelect = useCallback((seqId) => {
    setSelectedSeqId(seqId);
    const seq = allSequences.find(s => s.id === seqId);
    const name = seq?.name ? `"${seq.name}"` : 'la séquence';
    requestCapture(seqId, `Prévisualisation de ${name} sur le TV... (~12s)`);
  }, [allSequences, requestCapture]);

  const handleLive = useCallback(() => {
    requestCapture(null, 'Capture de l\'écran TV...');
  }, [requestCapture]);

  const handleEdit = (seqId) => navigate(`/planification?seq=${seqId}`);
  const handleNew = () => navigate('/planification?create=1');

  return (
    <div className="flex h-full min-h-0 overflow-hidden max-md:flex-col">
      <AlertContainer />
      <DashSidebar
        sequences={allSequences}
        activeSeqId={display?.sequenceId}
        selectedSeqId={selectedSeqId}
        layouts={layouts}
        onSelect={handleSelect}
        onEdit={handleEdit}
        onNew={handleNew}
        onDeleted={loadDashboard}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div ref={previewRef} className="flex-1 relative bg-black overflow-hidden flex items-center justify-center max-md:min-h-0">

          {/* Bouton Live TV */}
          <button
            onClick={handleLive}
            disabled={captureLoading}
            className="absolute top-2 right-2 z-10 px-3 py-1.5 text-xs font-semibold
                       bg-black/60 hover:bg-black/80 text-white rounded-lg border border-white/20
                       backdrop-blur-sm transition disabled:opacity-40"
            title="Voir l'écran TV en direct"
          >
            📺 Live TV
          </button>

          {/* Image TV */}
          {captureImage && (
            <img
              src={captureImage}
              alt="Aperçu TV"
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: 'fill',
                transform: captureRotation?.startsWith('portrait')
                  ? `${ROTATION_FIX[captureRotation]} scale(${portraitScale})`
                  : (ROTATION_FIX[captureRotation] || 'none'),
              }}
            />
          )}

          {/* Overlay de chargement (par-dessus l'image précédente) */}
          {captureLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 z-10">
              <span className="inline-block w-6 h-6 border-2 border-white/20 rounded-full border-t-accent animate-spin" />
              <span className="text-xs text-text-dim text-center px-6">{captureLabel}</span>
            </div>
          )}

          {/* Erreur */}
          {!captureLoading && captureError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-red-400 text-sm text-center px-8">{captureError}</p>
            </div>
          )}

          {/* État vide */}
          {!captureLoading && !captureImage && !captureError && (
            <div className="text-text-dim text-sm">
              {loading ? 'Chargement...' : 'Cliquez sur une séquence pour prévisualiser'}
            </div>
          )}
        </div>
        <DashStats />
      </div>
    </div>
  );
}
