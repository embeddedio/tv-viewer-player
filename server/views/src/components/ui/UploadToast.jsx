import { useEffect, useRef, useState } from 'react';

export default function UploadToast() {
  const [state, setState] = useState({ visible: false, phase: 'encoding', percent: 0, fileName: '', label: '' });
  const dismissTimer = useRef(null);

  useEffect(() => {
    const onStart = (e) => {
      clearTimeout(dismissTimer.current);
      setState({ visible: true, phase: 'encoding', percent: 0, fileName: e.detail.fileName || '', label: e.detail.label || 'Chargement...' });
    };
    const onProgress = (e) => {
      setState(prev => ({
        ...prev,
        visible: true,
        phase: e.detail.phase ?? prev.phase,
        percent: e.detail.percent ?? prev.percent,
        fileName: e.detail.fileName ?? prev.fileName,
      }));
    };
    const onDone = (e) => {
      const success = e.detail?.success !== false;
      setState(prev => ({ ...prev, phase: success ? 'success' : 'error', percent: success ? 100 : prev.percent }));
      dismissTimer.current = setTimeout(
        () => setState(prev => ({ ...prev, visible: false })),
        success ? 1800 : 3500,
      );
    };

    window.addEventListener('upload:start', onStart);
    window.addEventListener('upload:progress', onProgress);
    window.addEventListener('upload:done', onDone);
    return () => {
      window.removeEventListener('upload:start', onStart);
      window.removeEventListener('upload:progress', onProgress);
      window.removeEventListener('upload:done', onDone);
    };
  }, []);

  if (!state.visible) return null;

  const isSuccess = state.phase === 'success';
  const isError   = state.phase === 'error';
  const isDone    = isSuccess || isError;
  const isEncoding = state.phase === 'encoding';
  const pct = Math.round(state.percent);

  const icon = isSuccess ? '✓' : isError ? '✕' : '↑';

  const sem = isSuccess ? '--color-green' : isError ? '--color-red' : '--color-accent';
  const iconBg     = `rgb(var(${sem}) / 0.10)`;
  const iconBorder = `rgb(var(${sem}) / 0.30)`;
  const iconColor  = `rgb(var(${sem}))`;

  const barBg = isDone
    ? `rgb(var(${sem}))`
    : 'linear-gradient(90deg, rgb(var(--color-accent)), rgb(var(--color-accent2)))';

  const phaseLabel = isSuccess
    ? 'Envoi terminé !'
    : isError
    ? 'Échec — veuillez réessayer'
    : isEncoding
    ? 'Encodage des fichiers...'
    : 'Envoi vers le serveur...';

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(460px, calc(100vw - 32px))',
      zIndex: 9999,
      background: 'rgb(var(--color-card))',
      border: '1px solid rgb(var(--color-border))',
      borderRadius: 16,
      padding: '16px 20px 14px',
      boxShadow: 'var(--shadow-card), 0 16px 48px rgb(0 0 0 / 0.35)',
      animation: 'uploadSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: iconBg, border: `1px solid ${iconBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: iconColor,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--color-text))', lineHeight: 1.3 }}>
            {state.label || 'Chargement'}
          </div>
          {state.fileName && (
            <div style={{ fontSize: 11, color: 'rgb(var(--color-text-dim))', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {state.fileName}
            </div>
          )}
        </div>

        {!isDone && (
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--color-accent))', flexShrink: 0, lineHeight: 1.3 }}>
            {pct}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, background: 'rgb(var(--color-text) / 0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
        {isEncoding ? (
          <div style={{
            height: '100%', width: '38%', borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, rgb(var(--color-accent) / 0.55), transparent)',
            animation: 'uploadShimmer 1.4s ease-in-out infinite',
          }} />
        ) : (
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 999,
            background: barBg,
            boxShadow: !isDone ? '0 0 10px rgb(var(--color-accent) / 0.35)' : 'none',
            transition: 'width 0.22s ease, background 0.3s ease',
          }} />
        )}
      </div>

      {/* Phase label */}
      <div style={{ fontSize: 10, color: 'rgb(var(--color-text-muted))' }}>
        {phaseLabel}
      </div>

      <style>{`
        @keyframes uploadSlideIn {
          from { transform: translateX(-50%) translateY(18px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
        }
        @keyframes uploadShimmer {
          0%   { margin-left: -38%; }
          100% { margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
