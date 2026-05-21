import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function RateOverrideModal({ onClose }) {
  const [rates, setRates] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await api('/api/widgets/tableau-change');
      if (data && Array.isArray(data.rates)) {
        setRates(data.rates);
        const existing = {};
        if (data.overrides) {
          for (const [code, ov] of Object.entries(data.overrides)) {
            existing[code] = { buy: ov.buy || '', sell: ov.sell || '' };
          }
        }
        setOverrides(existing);
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (code, field, value) => {
    setOverrides(prev => {
      const current = prev[code] || {};
      const rate = rates.find(r => r.code === code);
      const originalBuy = rate?.buy || '';
      const originalSell = rate?.sell || '';
      const updated = { ...current, [field]: value };
      const buyVal = updated.buy !== undefined ? updated.buy : originalBuy;
      const sellVal = updated.sell !== undefined ? updated.sell : originalSell;
      if (buyVal === originalBuy && sellVal === originalSell) {
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }
      return { ...prev, [code]: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const entries = Object.entries(overrides).map(([code, vals]) => ({
      code,
      buy: vals.buy,
      sell: vals.sell,
    }));
    await api('/api/widgets/tableau-change/overrides', {
      method: 'POST',
      body: JSON.stringify({ overrides: entries }),
    });
    setSaving(false);
    onClose();
  };

  const handleReset = async () => {
    setSaving(true);
    await api('/api/widgets/tableau-change/overrides', { method: 'DELETE' });
    setOverrides({});
    setSaving(false);
    onClose();
  };

  const isOverridden = (code) => !!overrides[code];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#152238]">
          <div>
            <h2 className="text-lg font-bold text-white">Modifier les taux de change</h2>
            <p className="text-[0.7rem] text-white/60 mt-0.5">
              Les modifications manuelles expirent automatiquement apres 24h
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xl leading-none cursor-pointer transition-colors">&times;</button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-400 py-12">Chargement...</p>
          ) : rates.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucun taux disponible</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-semibold">Devise</th>
                  <th className="text-right px-4 py-3 font-semibold">Achat</th>
                  <th className="text-right px-6 py-3 font-semibold">Vente</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate, i) => {
                  const ov = overrides[rate.code];
                  const highlighted = isOverridden(rate.code);
                  return (
                    <tr key={rate.code} className={`border-b border-gray-100 transition-colors ${highlighted ? 'bg-cyan-50' : i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-6 py-3">
                        <span className="font-bold text-gray-800">{rate.code}</span>
                        <span className="ml-2 text-gray-400 text-xs">{rate.label}</span>
                        {highlighted && <span className="ml-2 text-cyan-600 text-[0.65rem] font-semibold uppercase">modifie</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="text"
                          value={ov?.buy !== undefined ? ov.buy : rate.buy}
                          onChange={e => handleChange(rate.code, 'buy', e.target.value)}
                          className="w-24 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-right text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <input
                          type="text"
                          value={ov?.sell !== undefined ? ov.sell : rate.sell}
                          onChange={e => handleChange(rate.code, 'sell', e.target.value)}
                          className="w-24 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 text-right text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleReset}
            disabled={saving || Object.keys(overrides).length === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Reinitialiser tout
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#152238] text-white hover:bg-[#1e3a5f] disabled:opacity-60 cursor-pointer transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
