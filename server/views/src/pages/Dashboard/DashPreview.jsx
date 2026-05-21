import DashZonePlayer from './DashZonePlayer';

function DashNode({ node, display, mediaFiles }) {
  if (node.id) {
    const zoneData = display.zones?.[node.id];
    return (
      <div className="overflow-hidden relative flex items-center justify-center" style={{ flex: node.flex }}>
        <DashZonePlayer zoneId={node.id} zoneData={zoneData} mediaFiles={mediaFiles} />
      </div>
    );
  }
  return (
    <div
      className="flex"
      style={{ flexDirection: node.direction === 'column' ? 'column' : 'row', flex: node.flex }}
    >
      {node.children.map((child, i) => (
        <DashNode key={i} node={child} display={display} mediaFiles={mediaFiles} />
      ))}
    </div>
  );
}

export default function DashPreview({ display, layouts, mediaFiles }) {
  const tpl = layouts[display.layoutId] || { label: '', root: { id: 'zone1', flex: 1 } };
  const root = display.customLayout || tpl.root;

  return (
    <div className="flex absolute inset-0" style={{ flexDirection: root.direction === 'column' ? 'column' : 'row' }}>
      <DashNode node={root} display={display} mediaFiles={mediaFiles} />
    </div>
  );
}
