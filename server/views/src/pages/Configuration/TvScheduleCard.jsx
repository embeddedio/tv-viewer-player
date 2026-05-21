import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import { api } from '../../api';
import { showAlert } from '../../components/ui/Alert';

const DAY_LABELS = [
  { id: 0, short: 'Dim', long: 'Dimanche' },
  { id: 1, short: 'Lun', long: 'Lundi' },
  { id: 2, short: 'Mar', long: 'Mardi' },
  { id: 3, short: 'Mer', long: 'Mercredi' },
  { id: 4, short: 'Jeu', long: 'Jeudi' },
  { id: 5, short: 'Ven', long: 'Vendredi' },
  { id: 6, short: 'Sam', long: 'Samedi' },
];

const inputClass = 'w-full px-3 py-2.5 bg-black/30 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent [color-scheme:dark]';

export default function TvScheduleCard() {
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [stopTime, setStopTime] = useState('22:00');
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/tv-schedule').then(data => {
      if (data) {
        setEnabled(!!data.enabled);
        setStartTime(data.startTime || '08:00');
        setStopTime(data.stopTime || '22:00');
        setDays(Array.isArray(data.days) ? data.days : [1, 2, 3, 4, 5]);
      }
    });
  }, []);

  const toggleDay = (dayId) => {
    setDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await api('/api/tv-schedule', {
      method: 'POST',
      body: JSON.stringify({ enabled, startTime, stopTime, days }),
    });
    setSaving(false);
    if (r?.success) {
      showAlert('Programmation TV mise a jour');
    }
  };

  return (
    <Card title="Programmation TV (HDMI-CEC)" className="md:col-span-2">
      <div className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text">Activer la programmation</span>
          <div
            onClick={() => setEnabled(e => !e)}
            className="cursor-pointer select-none"
            style={{ width: 48, height: 26, position: 'relative' }}
          >
            <div
              style={{
                width: 48, height: 26, borderRadius: 13,
                backgroundColor: enabled ? '#10b981' : 'rgba(255,255,255,0.15)',
                transition: 'background-color 0.2s',
              }}
            />
            <div
              style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: '#fff',
                position: 'absolute', top: 3,
                left: enabled ? 25 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {enabled && (
          <>
            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Heure d'allumage</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Heure d'extinction</label>
                <input
                  type="time"
                  value={stopTime}
                  onChange={e => setStopTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Days */}
            <div>
              <label className="block text-xs text-text-muted mb-2">Jours actifs (ecran allume)</label>
              <div className="flex gap-2 flex-wrap">
                {DAY_LABELS.map(day => {
                  const active = days.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      title={day.long}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all cursor-pointer ${
                        active
                          ? 'border-emerald-400 bg-emerald-400/15 text-emerald-400'
                          : 'border-white/15 text-text-dim hover:border-white/30'
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.65rem] text-text-dim mt-2">
                Les jours non coches, l'ecran sera eteint toute la journee.
              </p>
            </div>
          </>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 text-sm font-semibold rounded-lg bg-accent text-bg hover:bg-accent/80 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Card>
  );
}
