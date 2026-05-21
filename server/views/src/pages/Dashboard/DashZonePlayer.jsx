import { useState, useEffect, useRef } from 'react';
import { uploadsUrl } from '../../api';
import { SPECIAL_WIDGETS } from '../../constants';
import { useApp } from '../../context/AppContext';
import { getFileType } from '../../utils';

export default function DashZonePlayer({ zoneId, zoneData, mediaFiles }) {
  const { widgets } = useApp();
  const allWidgets = [...widgets, ...SPECIAL_WIDGETS];
  const [index, setIndex] = useState(0);
  const timerRef = useRef(undefined);

  const items = zoneData?.items || [];
  const itemsLen = items.length;

  useEffect(() => {
    setIndex(0);
  }, [zoneId, itemsLen]);

  useEffect(() => {
    if (items.length <= 1) return;
    const currentItem = items[index % items.length];
    const duration = (currentItem?.duration || 10) * 1000;
    timerRef.current = setTimeout(() => {
      setIndex(prev => prev + 1);
    }, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [index, items]);

  if (!items.length) {
    return <div className="w-full h-full flex items-center justify-center text-text-dim text-[0.9rem]">Zone vide</div>;
  }

  const item = items[index % items.length];
  if (item.widgetType) {
    const widget = allWidgets.find(entry => entry.type === item.widgetType);

    if (item.widgetType === 'tableau-change') {
      const variantLabels = { simple: 'Tableau de Change', bkam: 'Réf BKAM', combined: 'Change + BKAM' };
      const variantColors = { simple: '#1e40af', bkam: '#065f46', combined: '#7c3aed' };
      const vLabel = variantLabels[item.variant] || 'Tableau de Change';
      const vColor = variantColors[item.variant] || '#1e40af';
      return (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2" style={{ backgroundColor: vColor }}>
          <span className="text-3xl">💱</span>
          <span className="text-white text-sm font-bold">{vLabel}</span>
          {!item.variant && (
            <span className="text-white/50 text-xs">Type non configuré — cliquer ⚙️</span>
          )}
        </div>
      );
    }

    if (item.widgetType === 'messages') {
      const msgs = Array.isArray(item.messages) && item.messages.length ? item.messages : ['Aucun message'];
      return (
        <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center overflow-hidden">
          <div className="flex items-center gap-3 px-4 whitespace-nowrap text-white text-lg font-bold animate-marquee">
            {msgs.map((m, i) => (
              <span key={i}>{m}{i < msgs.length - 1 && <span className="text-yellow-400 mx-2">{'\u2605'}</span>}</span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-text-dim text-sm">
        {widget?.label || item.widgetType}
      </div>
    );
  }

  const file = mediaFiles.find(f => f.name === item.mediaName);
  if (!file) {
    return <div className="w-full h-full flex items-center justify-center text-text-dim text-sm">{item.mediaName || '?'}</div>;
  }

  const url = uploadsUrl(file.name);
  const type = getFileType(file.name);

  if (type === 'video') {
    return (
      <video
        key={url}
        src={url}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-fill"
      />
    );
  }
  if (type === 'image') {
    return <img src={url} className="absolute inset-0 w-full h-full object-fill" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-text-dim text-sm text-center px-3">
      {file.originalName || file.name}
    </div>
  );
}
