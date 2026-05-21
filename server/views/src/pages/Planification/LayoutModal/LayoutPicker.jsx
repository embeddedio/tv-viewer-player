import LayoutMiniPreview from '../../../components/shared/LayoutMiniPreview';
import { getLeafZones } from '../../../utils/layoutTree';

export default function LayoutPicker({ layouts, selectedId, onPick }) {
  return (
    <div>
      {Object.entries(layouts).map(([id, t]) => {
        const leafCount = getLeafZones(t.root).length;
        return (
          <div
            key={id}
            onClick={() => onPick(id)}
            className={`flex items-center gap-3 p-3 border-2 rounded-lg mb-2 cursor-pointer transition-all ${
              selectedId === id
                ? 'border-accent bg-accent/[0.08]'
                : 'border-border hover:border-text-muted hover:bg-white/[0.03]'
            }`}
          >
            <LayoutMiniPreview root={t.root} className="pointer-events-none" />
            <div>
              <div className="font-semibold text-[0.9rem]">{t.label}</div>
              <div className="text-xs text-text-dim">{leafCount} zone{leafCount > 1 ? 's' : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
