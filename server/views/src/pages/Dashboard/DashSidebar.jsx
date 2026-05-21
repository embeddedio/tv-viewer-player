import Button from '../../components/ui/Button';
import { api } from '../../api';
import { showAlert } from '../../components/ui/Alert';
import LayoutMiniPreview from '../../components/shared/LayoutMiniPreview';

export default function DashSidebar({
  sequences,
  activeSeqId,
  selectedSeqId,
  layouts,
  onSelect,
  onEdit,
  onNew,
  onDeleted,
  reorderEnabled = false,
  onReorder,
  onMoveSequence,
}) {
  const getLayoutRoot = (seq) => {
    const tpl = layouts[seq.layoutId] || layouts.fullscreen || { root: { id: 'zone1', flex: 1 } };
    return seq.customLayout || tpl.root;
  };

  const formatDuration = (totalSec) => {
    const sec = Math.max(0, parseInt(String(totalSec || 0), 10) || 0);
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const handleDelete = async (seq) => {
    if (!confirm(`Supprimer la sequence "${seq.name || ''}" ?`)) return;
    await api(`/api/sequences/${seq.id}`, { method: 'DELETE' });
    showAlert('Sequence supprimee');
    onDeleted();
  };

  const handleDragStart = (e, seq) => {
    if (!reorderEnabled || seq.scheduleType !== 'continue') return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ seqId: seq.id }));
  };

  const handleDrop = (e, targetSeq) => {
    if (!onReorder || !reorderEnabled) return;
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (!data?.seqId || data.seqId === targetSeq.id) return;
      if (targetSeq.scheduleType !== 'continue') return;
      onReorder(data.seqId, targetSeq.id);
    } catch {}
  };

  // Separer et trier
  const continueSeqs = [...sequences]
    .filter(s => s.scheduleType === 'continue')
    .sort((a, b) => (Number(a.loopOrder) || 0) - (Number(b.loopOrder) || 0));

  const customSeqs = [...sequences]
    .filter(s => s.scheduleType === 'custom')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const canMoveUp = (seq, idx) => reorderEnabled && idx > 0;
  const canMoveDown = (seq, idx) => reorderEnabled && idx < continueSeqs.length - 1;

  const renderSeqCard = (s, { showReorder = false, orderIndex = -1 } = {}) => {
    const isActive = s.id === activeSeqId;
    const isSelected = s.id === selectedSeqId;
    const isContinue = s.scheduleType === 'continue';

    return (
      <div
        key={s.id}
        onClick={() => onSelect(s.id)}
        draggable={!!showReorder}
        onDragStart={e => handleDragStart(e, s)}
        onDragOver={e => { if (showReorder) e.preventDefault(); }}
        onDrop={e => handleDrop(e, s)}
        className={`relative min-h-[58px] px-2 py-[5px] rounded-lg cursor-pointer border mb-1 text-sm transition-all flex items-stretch gap-1.5 ${
          isSelected
            ? 'bg-accent/10 border-accent'
            : isActive
              ? 'bg-white/5 border-white/10'
              : 'border-transparent hover:bg-white/5'
        }`}
      >
        {showReorder && (
          <div className="flex flex-col justify-center gap-1 self-center shrink-0">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onMoveSequence?.(s.id, 'up'); }}
              disabled={!canMoveUp(s, orderIndex)}
              className="w-6 h-6 rounded border border-border bg-black/25 text-text text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Monter"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onMoveSequence?.(s.id, 'down'); }}
              disabled={!canMoveDown(s, orderIndex)}
              className="w-6 h-6 rounded border border-border bg-black/25 text-text text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Descendre"
            >
              ↓
            </button>
          </div>
        )}
        {showReorder && (
          <span className="self-center shrink-0 w-5 text-center text-xs font-bold text-text-dim">
            {orderIndex + 1}
          </span>
        )}
        <div className="relative shrink-0 self-center">
          <LayoutMiniPreview
            root={getLayoutRoot(s)}
            className="!w-11 !h-11 !rounded-md !border !border-border"
          />
        </div>
        <div className="min-w-0 flex-1 self-center flex flex-col justify-center">
          <span className={`block overflow-hidden text-ellipsis whitespace-nowrap text-[0.8rem] leading-tight font-medium ${!s.name ? 'text-text-dim italic' : ''}`}>
            {s.name || 'Sans nom'}
          </span>
          <div className="mt-0.5 text-[0.68rem] leading-[1.15] text-white/90 flex flex-col gap-0">
            {isContinue ? (
              <span>{formatDuration(s.loopDurationSec || 10)}</span>
            ) : (
              <>
                {(s.startTime || s.endTime) && (
                  <span>{s.startTime || '00:00'} - {s.endTime || '23:59'}</span>
                )}
                {(s.startDate || s.endDate) && (
                  <span>{s.startDate || '...'} → {s.endDate || '...'}</span>
                )}
                {s.days?.length > 0 && (
                  <span className="text-text-dim">{s.days.join(', ')}</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 self-center ml-auto shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(s.id); }}
            className="w-8 h-8 flex items-center justify-center bg-black/25 border border-border text-text cursor-pointer text-sm font-bold leading-none rounded-md hover:text-accent hover:bg-accent/10 hover:border-accent/40"
            title="Modifier"
          >
            &#9998;
          </button>
          <button
            onClick={e => { e.stopPropagation(); handleDelete(s); }}
            className="w-8 h-8 flex items-center justify-center bg-black/25 border border-red/30 text-red cursor-pointer text-lg font-bold leading-none rounded-md hover:bg-red/10 hover:border-red/60"
            title="Supprimer"
          >
            &times;
          </button>
        </div>
        {isActive && (
          <span className="absolute right-11 top-0.5 text-[0.56rem] leading-none font-medium text-green-400">
            Active
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-[280px] max-md:w-full shrink-0 bg-bg-card border-r max-md:border-r-0 max-md:border-b border-border overflow-y-auto p-4 max-md:basis-1/2 max-md:h-1/2 max-md:min-h-0">
      <Button sm className="w-full mb-3 justify-center" onClick={onNew}>
        + Nouvelle sequence
      </Button>

      {!sequences.length && (
        <p className="text-text-dim text-sm text-center py-5">Aucune sequence</p>
      )}

      {/* Section Continue */}
      {continueSeqs.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-accent/80">Continue</span>
            <span className="text-[0.6rem] text-text-dim bg-accent/10 px-1.5 py-0.5 rounded-full">{continueSeqs.length}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {continueSeqs.map((s, idx) =>
            renderSeqCard(s, { showReorder: reorderEnabled, orderIndex: idx })
          )}
        </div>
      )}

      {/* Section Personnalise */}
      {customSeqs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-orange-400/80">Personnalise</span>
            <span className="text-[0.6rem] text-text-dim bg-orange-400/10 px-1.5 py-0.5 rounded-full">{customSeqs.length}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {customSeqs.map(s => renderSeqCard(s))}
        </div>
      )}
    </div>
  );
}
