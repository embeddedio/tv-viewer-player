import { ZONE_COLORS } from '../../constants';

export default function ZoneTabs({ leaves, selectedZoneId, onSelect }) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {leaves.map((z, i) => {
        const isAudio = z.id === 'audio';
        const num = parseInt((z.id || '').replace('zone', '')) || (i + 1);
        return (
          <div
            key={z.id}
            onClick={() => z.id && onSelect(z.id)}
            className={`px-4 py-2 rounded-t-lg cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border border-b-0 transition-all ${
              z.id === selectedZoneId
                ? 'text-text bg-bg-card border-accent'
                : 'text-text-muted bg-black/20 border-border hover:text-text hover:bg-white/5'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }}
            />
            {isAudio ? 'Audio' : `Zone ${num}`}
          </div>
        );
      })}
    </div>
  );
}
