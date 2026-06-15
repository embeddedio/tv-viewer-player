import { useCallback, useEffect, useRef, useState } from 'react';
import { deepClone, getFileType } from '../../utils';
import ZoneItemRow from './ZoneItem';
import MessagesModal from './MessagesModal';
import WidgetStyleModal from './WidgetStyleModal';
import { useApp } from '../../context/AppContext';
import { SPECIAL_WIDGETS } from '../../constants';

export default function ZoneItemsList({ seq, selectedZoneId, isAudioZone, onSave }) {
  const { widgets } = useApp();
  const allWidgets = [...widgets, ...SPECIAL_WIDGETS];
  const dragIdx = useRef(null);
  const items = seq.zones?.[selectedZoneId]?.items || [];
  const [editingMsgIdx, setEditingMsgIdx] = useState(null);
  const [editingStyleIdx, setEditingStyleIdx] = useState(null);
  const [editingSidebarIdx, setEditingSidebarIdx] = useState(null);
  const [sidebarUrl, setSidebarUrl] = useState(null);

  const updateItems = useCallback((newItems) => {
    const updated = deepClone(seq);
    if (!updated.zones) updated.zones = {};
    if (!updated.zones[selectedZoneId]) updated.zones[selectedZoneId] = { type: 'playlist', items: [] };
    updated.zones[selectedZoneId].items = newItems;
    onSave(updated);
  }, [seq, selectedZoneId, onSave]);

  const handleRemove = (idx) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    updateItems(newItems);
  };

  const handleDuration = (idx, duration) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], duration };
    updateItems(newItems);
  };

  const handleMuted = (idx, muted) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], muted };
    updateItems(newItems);
  };

  const handleUpdateItem = (idx, updatedItem) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], ...updatedItem };
    updateItems(newItems);
  };

  const handleDragStart = (idx) => {
    dragIdx.current = idx;
  };

  const handleDrop = (dropIdx) => {
    if (dragIdx.current === null || dragIdx.current === dropIdx) return;
    const newItems = [...items];
    const [moved] = newItems.splice(dragIdx.current, 1);
    newItems.splice(dropIdx, 0, moved);
    dragIdx.current = null;
    updateItems(newItems);
  };

  const closeSidebar = useCallback(() => {
    setEditingSidebarIdx(null);
    setSidebarUrl(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'widget-sidebar-save' && editingSidebarIdx !== null) {
        // Récupère TOUS les champs envoyés par le widget (sources, slideDuration, animation, variant, theme…)
        const { type, ...updates } = e.data;
        handleUpdateItem(editingSidebarIdx, updates);
      }
      if (e.data?.type === 'widget-settings-close') closeSidebar();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [editingSidebarIdx, closeSidebar]);

  const openWidgetSidebar = useCallback((idx) => {
    const item = items[idx];
    if (!item?.widgetType) return;
    const manifest = allWidgets.find(w => w.type === item.widgetType);
    const sidebarPage = manifest?.settingsPages?.item;
    if (!sidebarPage) return;
    // Passe TOUS les réglages de l'item en params URL (sources, slideDuration, animation, variant, theme…)
    const p = {};
    Object.entries(item).forEach(([k, v]) => {
      if (v == null) return;
      p[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
    setSidebarUrl(`${sidebarPage}?${new URLSearchParams(p)}`);
    setEditingSidebarIdx(idx);
  }, [items, allWidgets]);

  const handleZoneDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.mediaName) {
        if (isAudioZone && getFileType(data.mediaName) !== 'audio') return;
        const newItem = { mediaName: data.mediaName, originalName: data.originalName, duration: 10 };
        if (getFileType(data.mediaName) === 'video') newItem.muted = true;
        updateItems([...items, newItem]);
      }
    } catch {}
  };

  if (!items.length) {
    return (
      <div
        className="flex-1 border border-dashed border-border rounded-lg p-2 min-h-[80px]"
        onDragOver={e => e.preventDefault()}
        onDrop={handleZoneDrop}
      >
        <p className="text-center py-5 text-text-dim text-sm">
          {isAudioZone ? 'Glissez des fichiers audio ici' : 'Glissez des medias ou widgets ici'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 border border-dashed border-border rounded-lg p-2 overflow-y-auto min-h-[80px]"
      onDragOver={e => e.preventDefault()}
      onDrop={handleZoneDrop}
    >
      {items.map((item, i) => (
        <ZoneItemRow
          key={`${i}-${item.mediaName || item.widgetType}`}
          item={item}
          index={i}
          onRemove={handleRemove}
          onDuration={handleDuration}
          onMuted={handleMuted}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onUpdateItem={handleUpdateItem}
          onEditMessages={(idx) => setEditingMsgIdx(idx)}
          onEditWidgetSidebar={allWidgets.find(w => w.type === item.widgetType)?.settingsPages?.item ? openWidgetSidebar : undefined}
          onEditWidgetStyle={!allWidgets.find(w => w.type === item.widgetType)?.settingsPages?.item ? (idx) => setEditingStyleIdx(idx) : undefined}
        />
      ))}
      {sidebarUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeSidebar}
        >
          <div
            className="relative w-[400px] bg-bg rounded-xl overflow-hidden shadow-2xl border border-border"
            onClick={e => e.stopPropagation()}
          >
            <iframe src={sidebarUrl} className="w-full border-0" style={{ height: '320px' }} />
          </div>
        </div>
      )}
      {editingMsgIdx !== null && items[editingMsgIdx] && (
        <MessagesModal
          item={items[editingMsgIdx]}
          onClose={() => setEditingMsgIdx(null)}
          onSave={(updatedItem) => {
            handleUpdateItem(editingMsgIdx, updatedItem);
            setEditingMsgIdx(null);
          }}
        />
      )}
      {editingStyleIdx !== null && items[editingStyleIdx] && (
        <WidgetStyleModal
          item={items[editingStyleIdx]}
          onClose={() => setEditingStyleIdx(null)}
          onSave={(updatedItem) => {
            handleUpdateItem(editingStyleIdx, updatedItem);
            setEditingStyleIdx(null);
          }}
        />
      )}
    </div>
  );
}
