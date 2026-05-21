import { useState, useEffect, useRef } from 'react';
import { api } from '../../api';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

function Bar({ percent, color = 'bg-accent' }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor = clamped > 85 ? 'bg-red' : clamped > 65 ? 'bg-yellow' : color;
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, sub, percent, color }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[0.65rem] uppercase tracking-wider text-text-dim font-semibold">{label}</span>
        <span className="text-sm font-bold text-text">{value}</span>
      </div>
      {percent !== undefined && <Bar percent={percent} color={color} />}
      {sub && <p className="text-[0.6rem] text-text-dim mt-1">{sub}</p>}
    </div>
  );
}

export default function DashStats() {
  const [stats, setStats] = useState(null);
  const timerRef = useRef(null);

  const load = async () => {
    const r = await api('/api/system-stats');
    if (r) setStats(r);
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!stats) return null;

  const memPercent = stats.memory.total > 0
    ? Math.round((stats.memory.used / stats.memory.total) * 100) : 0;

  const diskUsed = stats.disk.total > 0 ? stats.disk.total - stats.disk.free : 0;
  const diskPercent = stats.disk.total > 0
    ? Math.round((diskUsed / stats.disk.total) * 100) : 0;

  return (
    <div className="px-4 py-3 bg-bg-card border-t border-border flex items-center gap-6 flex-wrap">
      <StatCard
        label="Memoire"
        value={`${memPercent}%`}
        percent={memPercent}
        sub={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
      />
      <StatCard
        label="CPU"
        value={`${stats.cpu.usage}%`}
        percent={stats.cpu.usage}
        color="bg-accent2"
        sub={`${stats.cpu.count} coeur${stats.cpu.count > 1 ? 's' : ''}`}
      />
      <StatCard
        label="Disque"
        value={`${diskPercent}%`}
        percent={diskPercent}
        sub={`${formatBytes(stats.disk.free)} libre / ${formatBytes(stats.disk.total)}`}
      />
      <StatCard
        label="Medias"
        value={`${stats.storage.fileCount}`}
        sub={formatBytes(stats.storage.used)}
      />
      <div className="flex-1 min-w-[140px]">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[0.65rem] uppercase tracking-wider text-text-dim font-semibold">Uptime</span>
          <span className="text-sm font-bold text-text">{formatUptime(stats.uptime)}</span>
        </div>
        <p className="text-[0.6rem] text-text-dim mt-1 overflow-hidden text-ellipsis whitespace-nowrap" title={stats.storagePath}>
          {stats.storagePath}
        </p>
      </div>
    </div>
  );
}
