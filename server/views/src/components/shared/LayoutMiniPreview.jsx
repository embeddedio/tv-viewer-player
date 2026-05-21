import { ZONE_COLORS } from '../../constants';

function MiniNode({ node, counter }) {
  if (node.id) {
    const idx = counter.value++;
    const num = parseInt((node.id || '').replace('zone', '')) || (idx + 1);
    return (
      <div
        className="flex items-center justify-center text-[0.55rem] font-bold text-white/70"
        style={{ flex: node.flex, background: ZONE_COLORS[idx % ZONE_COLORS.length], minWidth: 2, minHeight: 2 }}
      >
        {num}
      </div>
    );
  }
  return (
    <div
      className="flex min-w-0 min-h-0"
      style={{ flexDirection: node.direction === 'column' ? 'column' : 'row', flex: node.flex }}
    >
      {node.children.map((child, i) => (
        <MiniNode key={i} node={child} counter={counter} />
      ))}
    </div>
  );
}

export default function LayoutMiniPreview({ root, onClick, className = '' }) {
  const counter = { value: 0 };
  return (
    <div
      onClick={onClick}
      className={`w-20 h-[50px] border-2 border-border rounded-md cursor-pointer flex overflow-hidden transition-all hover:border-accent shrink-0 ${className}`}
      style={{ flexDirection: root.direction === 'column' ? 'column' : 'row' }}
      title="Cliquez pour changer le layout"
    >
      <MiniNode node={root} counter={counter} />
    </div>
  );
}
