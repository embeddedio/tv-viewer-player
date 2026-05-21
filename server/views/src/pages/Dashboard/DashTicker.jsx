export default function DashTicker({ devises }) {
  if (!devises.length) return null;

  const duration = Math.max(10, devises.length * 4);

  const items = devises.map((d, i) => (
    <span key={i} className="inline-flex items-center gap-3 text-text text-[0.9rem]">
      {d.icon && d.icon.startsWith('http') ? (
        <img src={d.icon} className="w-6 h-6 rounded-full" />
      ) : (
        <span>{d.icon || d.code}</span>
      )}
      <strong>{d.code}</strong>
      {d.buy && <span className="text-green">{d.buyLabel || 'A'}: {d.buy}</span>}
      {d.sell && <span className="text-red">{d.sellLabel || 'V'}: {d.sell}</span>}
    </span>
  ));

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 overflow-hidden whitespace-nowrap">
      <div
        className="inline-flex gap-10 py-2"
        style={{ animation: `marquee ${duration}s linear infinite` }}
      >
        {items}
        {items}
      </div>
    </div>
  );
}
