import { useRef, useState } from 'react';
import { uploadFiles } from '../../api';
import { deepClone, getFileType } from '../../utils';
import { SPECIAL_WIDGETS } from '../../constants';
import MediaThumb from '../../components/shared/MediaThumb';
import AddItemModal from './AddItemModal';
import { showAlert } from '../../components/ui/Alert';
import { useApp } from '../../context/AppContext';

export default function SourceSidebar({ mediaFiles, seq, selectedZoneId, isAudioZone, onSave, onWidgetSettings }) {
  const { reloadMedia, widgets } = useApp();
  const allWidgets = [...widgets, ...SPECIAL_WIDGETS];
  const uploadInputRef = useRef(null);
  const [tab, setTab] = useState('medias');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mediaOnly = mediaFiles.filter(f => f.category !== 'logo');

  const canAddToSelectedZone = (item) => {
    if (!isAudioZone) return true;
    if (item.widgetType) {
      showAlert('Zone audio: widgets non autorises', 'warning');
      return false;
    }
    if (item.mediaName && getFileType(item.mediaName) !== 'audio') {
      showAlert('Zone audio: seuls les fichiers audio sont autorises', 'warning');
      return false;
    }
    return true;
  };

  const addItem = (item) => {
    if (!seq) return;
    if (!canAddToSelectedZone(item)) return;
    const updated = deepClone(seq);
    if (!updated.zones) updated.zones = {};
    if (!updated.zones[selectedZoneId]) updated.zones[selectedZoneId] = { type: 'playlist', items: [] };
    if (!updated.zones[selectedZoneId].items) updated.zones[selectedZoneId].items = [];
    updated.zones[selectedZoneId].items.push(item);
    onSave(updated);
  };

  const addItems = (items) => {
    if (!seq) return;
    const validItems = items.filter(canAddToSelectedZone);
    if (!validItems.length) return;
    const updated = deepClone(seq);
    if (!updated.zones) updated.zones = {};
    if (!updated.zones[selectedZoneId]) updated.zones[selectedZoneId] = { type: 'playlist', items: [] };
    if (!updated.zones[selectedZoneId].items) updated.zones[selectedZoneId].items = [];
    updated.zones[selectedZoneId].items.push(...validItems);
    onSave(updated);
  };

  const handleUploadFiles = async (fileList) => {
    if (!seq) return;
    const list = Array.from(fileList || []);
    if (!list.length) return;

    try {
      setUploading(true);
      const uploadRes = await uploadFiles(list, { category: 'media' });

      if (!uploadRes?.success || !Array.isArray(uploadRes.saved) || !uploadRes.saved.length) {
        showAlert(uploadRes?.message || "Erreur lors de l'upload", 'error');
        return;
      }

      await reloadMedia();

      const uploadedItems = uploadRes.saved.map((entry) => ({
        mediaName: entry.name,
        originalName: entry.originalName || entry.name,
        duration: 10,
      }));
      addItems(uploadedItems);
      showAlert(`${uploadRes.saved.length} media(s) uploade(s) et ajoute(s)`);
    } catch (_) {
      showAlert("Erreur lors de l'upload", 'error');
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  return (
    <div className="w-[280px] max-lg:w-full shrink-0 bg-bg-card border border-border rounded-xl p-4 overflow-y-auto">
      <div className="flex gap-1 mb-3">
        {['medias', 'widgets'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-center rounded-md cursor-pointer text-xs font-semibold border-none transition-all ${
              tab === t ? 'bg-accent/15 text-accent' : 'bg-black/20 text-text-muted'
            }`}
          >
            {t === 'medias' ? 'Medias' : 'Widgets'}
          </button>
        ))}
      </div>

      {tab === 'medias' && (
        <>
          <button
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="w-full mb-2 py-2 text-sm font-semibold text-accent bg-accent/10 border border-accent/30 rounded-md cursor-pointer hover:bg-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? 'Upload en cours...' : '+ Uploader des medias'}
          </button>
        </>
      )}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={e => handleUploadFiles(e.target.files)}
      />

      {tab === 'medias' ? (
        !mediaOnly.length ? (
          <p className="text-text-dim text-sm text-center py-5">Aucun media</p>
        ) : (
          mediaOnly.map(f => (
            <div
              key={f.name}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                  mediaName: f.name,
                  originalName: f.originalName || f.name,
                }));
              }}
              className="flex items-center gap-2 p-2 rounded-md mb-1 text-xs cursor-grab border border-transparent hover:bg-white/5 hover:border-border transition-all"
            >
              <MediaThumb file={f} size="sm" />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap" title={f.name}>
                {f.originalName || f.name}
              </span>
              <button
                onClick={() => addItem({ mediaName: f.name, originalName: f.originalName || f.name, duration: 10 })}
                className="w-7 h-7 flex items-center justify-center bg-accent/10 border border-accent/30 text-accent cursor-pointer font-bold text-lg rounded-md hover:bg-accent/20 shrink-0"
              >
                +
              </button>
            </div>
          ))
        )
      ) : (
        allWidgets.map(w => (
          <div key={w.type} className="flex items-center gap-2 p-2 rounded-md mb-1 text-xs border border-transparent hover:bg-white/5 hover:border-border transition-all">
            <span className="text-lg">{w.icon}</span>
            <span className="flex-1">{w.label}</span>
            {onWidgetSettings && w.settingsPages?.widget && (
              <button
                onClick={() => onWidgetSettings(w.type)}
                className="w-7 h-7 flex items-center justify-center bg-white/5 border border-border text-text-dim cursor-pointer text-sm rounded-md hover:bg-accent/10 hover:text-accent hover:border-accent/30 shrink-0"
                title="Modifier les valeurs"
              >
                &#9881;
              </button>
            )}
            <button
              onClick={() => addItem({ widgetType: w.type, duration: 10 })}
              className="w-7 h-7 flex items-center justify-center bg-accent/10 border border-accent/30 text-accent cursor-pointer font-bold text-lg rounded-md hover:bg-accent/20 shrink-0"
            >
              +
            </button>
          </div>
        ))
      )}

      {showAddModal && (
        <AddItemModal
          mediaFiles={mediaOnly}
          onClose={() => setShowAddModal(false)}
          onConfirm={addItems}
        />
      )}
    </div>
  );
}
