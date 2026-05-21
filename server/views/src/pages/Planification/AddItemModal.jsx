import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { uploadsUrl } from '../../api';
import { getFileType } from '../../utils';
import { SPECIAL_WIDGETS } from '../../constants';
import { useApp } from '../../context/AppContext';

export default function AddItemModal({ mediaFiles, onClose, onConfirm }) {
  const { widgets } = useApp();
  const allWidgets = [...widgets, ...SPECIAL_WIDGETS];
  const [tab, setTab] = useState('medias');
  const [selected, setSelected] = useState([]);

  const toggleMedia = (f) => {
    const idx = selected.findIndex(s => s.mediaName === f.name);
    if (idx >= 0) {
      setSelected(selected.filter((_, i) => i !== idx));
    } else {
      const newItem = { mediaName: f.name, originalName: f.originalName || f.name, duration: 10 };
      if (getFileType(f.name) === 'video') newItem.muted = true;
      setSelected([...selected, newItem]);
    }
  };

  const toggleWidget = (type) => {
    const idx = selected.findIndex(s => s.widgetType === type);
    if (idx >= 0) {
      setSelected(selected.filter((_, i) => i !== idx));
    } else {
      setSelected([...selected, { widgetType: type, duration: 10 }]);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="500px">
      <h2 className="text-base mb-4">Ajouter a la Zone</h2>
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

      <div className="max-h-[50vh] overflow-y-auto">
        {tab === 'medias' ? (
          !mediaFiles.length ? (
            <p className="text-text-dim text-sm text-center py-5">Aucun media uploade</p>
          ) : (
            mediaFiles.map(f => {
              const isSelected = selected.some(s => s.mediaName === f.name);
              const type = getFileType(f.name);
              const url = uploadsUrl(f.name);
              return (
                <div
                  key={f.name}
                  onClick={() => toggleMedia(f)}
                  className={`flex items-center gap-2.5 p-2 rounded-md border mb-1 cursor-pointer transition-all ${
                    isSelected ? 'bg-accent/[0.12] border-accent' : 'border-border hover:bg-white/5 hover:border-text-muted'
                  }`}
                >
                  <div className={`w-[18px] h-[18px] rounded border-2 shrink-0 flex items-center justify-center text-xs text-accent ${
                    isSelected ? 'border-accent bg-accent/20' : 'border-border'
                  }`}>
                    {isSelected && '✓'}
                  </div>
                  <div className="w-9 h-7 rounded bg-black/30 shrink-0 overflow-hidden flex items-center justify-center">
                    {type === 'image' ? (
                      <img src={url} loading="lazy" className="w-full h-full object-cover" />
                    ) : type === 'video' ? (
                      <span className="text-text-dim text-sm">&#9654;</span>
                    ) : (
                      <span className="text-text-dim text-sm">&#9835;</span>
                    )}
                  </div>
                  <span className="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                    {f.originalName || f.name}
                  </span>
                </div>
              );
            })
          )
        ) : (
          allWidgets.map(w => {
            const isSelected = selected.some(s => s.widgetType === w.type);
            return (
              <div
                key={w.type}
                onClick={() => toggleWidget(w.type)}
                className={`flex items-center gap-2.5 p-2 rounded-md border mb-1 cursor-pointer transition-all ${
                  isSelected ? 'bg-accent/[0.12] border-accent' : 'border-border hover:bg-white/5 hover:border-text-muted'
                }`}
              >
                <div className={`w-[18px] h-[18px] rounded border-2 shrink-0 flex items-center justify-center text-xs text-accent ${
                  isSelected ? 'border-accent bg-accent/20' : 'border-border'
                }`}>
                  {isSelected && '✓'}
                </div>
                <span className="text-base">{w.icon}</span>
                <span className="flex-1 text-sm">{w.label}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-text-dim">
          {selected.length} selectionne{selected.length > 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <Button sm variant="secondary" onClick={onClose}>Annuler</Button>
          <Button sm disabled={!selected.length} onClick={() => { onConfirm(selected); onClose(); }}>
            Ajouter
          </Button>
        </div>
      </div>
    </Modal>
  );
}
