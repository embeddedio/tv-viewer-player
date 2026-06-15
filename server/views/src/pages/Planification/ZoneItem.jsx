import MediaThumb from '../../components/shared/MediaThumb';
import { SPECIAL_WIDGETS } from '../../constants';
import { useApp } from '../../context/AppContext';
import { getFileType } from '../../utils';

export default function ZoneItemRow({ item, index, onRemove, onDuration, onMuted, onDragStart, onDrop, onUpdateItem, onEditMessages, onEditWidgetStyle, onEditWidgetSidebar }) {
  const { widgets } = useApp();
  const allWidgets = [...widgets, ...SPECIAL_WIDGETS];
  const isWidget = !!item.widgetType;
  const widget = isWidget ? allWidgets.find(w => w.type === item.widgetType) : null;
  const name = isWidget
    ? (widget?.label || item.widgetType)
    : (item.originalName || item.mediaName || '?');
  const isVideo = !isWidget && getFileType(item.mediaName || '') === 'video';
  const isAudio = !isWidget && getFileType(item.mediaName || '') === 'audio';
  const hideDuration = isVideo || isAudio;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop(index); }}
      className="flex items-center gap-2 px-2.5 py-2 bg-black/20 border border-border rounded-md mb-1 text-sm cursor-grab active:cursor-grabbing"
    >
      <span className="text-text-dim cursor-grab">&#9776;</span>
      {isWidget ? (
        <div className="w-8 h-6 rounded bg-black/30 shrink-0 overflow-hidden flex items-center justify-center text-sm text-text-dim">
          {widget?.icon || '\u2699'}
        </div>
      ) : (
        <MediaThumb
          file={{ name: item.mediaName || item.originalName || '' }}
          size="sm"
        />
      )}
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>

      {/* ⚙️ — réglages par zone (uniquement si le widget déclare settingsPages.item) */}
      {isWidget && widget?.settingsPages?.item && onEditWidgetSidebar && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditWidgetSidebar(index); }}
          className="w-7 h-7 flex items-center justify-center bg-white/5 border border-border text-text-dim cursor-pointer text-sm rounded-md hover:bg-accent/10 hover:text-accent hover:border-accent/30 shrink-0"
          title="Configurer"
        >
          &#9881;
        </button>
      )}

      {isVideo && (
        <label
          className="flex items-center gap-1 cursor-pointer select-none shrink-0"
          onClick={e => e.stopPropagation()}
          title={item.muted !== false ? 'Video en sourdine' : 'Video avec son'}
        >
          <input
            type="checkbox"
            checked={item.muted !== false}
            onChange={e => onMuted(index, e.target.checked)}
            className="accent-accent cursor-pointer"
          />
          <span className="text-[0.65rem] text-text-dim">Muet</span>
        </label>
      )}
      {hideDuration ? (
        <span className="text-xs text-text-dim italic">auto</span>
      ) : (
        <>
          <input
            type="number"
            value={item.duration || 10}
            min={1}
            className="w-[55px] px-1 py-0.5 bg-black/30 border border-border rounded text-text text-xs text-center focus:outline-none focus:border-accent"
            onChange={e => onDuration(index, parseInt(e.target.value) || 10)}
            onClick={e => e.stopPropagation()}
          />
          <span className="text-xs text-text-dim">s</span>
        </>
      )}

      {/* ⚙️ — messages */}
      {isWidget && item.widgetType === 'messages' && onEditMessages && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditMessages(index); }}
          className="w-7 h-7 flex items-center justify-center bg-white/5 border border-border text-text-dim cursor-pointer text-sm rounded-md hover:bg-accent/10 hover:text-accent hover:border-accent/30 shrink-0"
          title="Configurer les messages"
        >
          &#9881;
        </button>
      )}

      <button
        onClick={() => onRemove(index)}
        className="w-7 h-7 flex items-center justify-center bg-red/10 border border-red/30 text-red cursor-pointer font-bold text-lg rounded-md hover:bg-red/20 shrink-0"
      >
        &times;
      </button>
    </div>
  );
}
