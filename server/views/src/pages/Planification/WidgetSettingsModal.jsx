import { useEffect, useState } from 'react';
import { api } from '../../api';

// ─── Composants UI partagés ───────────────────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-3 mt-1">
      {title}
    </h3>
  );
}

function NumberField({ label, value, onChange, hint, step = 0.1, min = 0 }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        type="number"
        value={value === 0 ? '' : value}
        min={min}
        step={step}
        placeholder="0 = auto"
        onChange={e => {
          const v = parseFloat(e.target.value);
          onChange(isNaN(v) ? 0 : v);
        }}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                   text-gray-800 bg-gray-50 focus:outline-none focus:border-[#152238]
                   focus:ring-1 focus:ring-[#152238]/20 transition-all"
      />
      {hint && <span className="text-[0.6rem] text-gray-400">{hint}</span>}
    </div>
  );
}

// ─── Onglet Style (schema-driven) ────────────────────────────────────────────

function StyleTab({ widgetType, onClose }) {
  const [schema,  setSchema]  = useState(null);
  const [style,   setStyle]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/widget-schemas/${widgetType}.json`).then(r => r.json()).catch(() => null),
      api(`/api/widgets/${widgetType}/style`),
    ]).then(([sch, data]) => {
      if (sch)  setSchema(sch);
      if (data && typeof data === 'object') setStyle(data);
      setLoading(false);
    });
  }, [widgetType]);

  const set = (key) => (val) => setStyle(prev => ({ ...prev, [key]: val }));

  const allKeys = schema ? schema.sections.flatMap(s => s.fields.map(f => f.key)) : [];

  const handleSave = async () => {
    setSaving(true);
    await api(`/api/widgets/${widgetType}/style`, {
      method: 'POST',
      body: JSON.stringify(style),
    });
    setSaving(false);
    onClose();
  };

  const handleReset = async () => {
    const empty = Object.fromEntries(allKeys.map(k => [k, 0]));
    setSaving(true);
    await api(`/api/widgets/${widgetType}/style`, {
      method: 'POST',
      body: JSON.stringify(empty),
    });
    setSaving(false);
    onClose();
  };

  if (loading) return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    </div>
  );

  if (!schema) return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Aucun schéma de style pour ce widget.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {schema.sections.map(section => (
          <div key={section.title}>
            <SectionHeader title={section.title} />
            <div className="grid grid-cols-2 gap-4">
              {section.fields.map(field => (
                <NumberField
                  key={field.key}
                  label={field.label}
                  value={style[field.key] ?? 0}
                  onChange={set(field.key)}
                  step={field.step ?? 1}
                  hint={field.hint ?? ''}
                />
              ))}
            </div>
          </div>
        ))}
        <p className="text-[0.65rem] text-gray-400 italic">
          Toutes les valeurs à 0 → calcul automatique selon la taille du widget.
        </p>
      </div>

      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
        >
          Tout remettre à auto
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#152238] text-white hover:bg-[#1e3a5f] disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

function IframeModal({ url, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === 'widget-settings-close') onClose();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={url}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="Paramètres widget"
        />
      </div>
    </div>
  );
}

function TabModal({ widgetType, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-[#152238]">
          <h2 className="text-lg font-bold text-white">Parametres — {widgetType}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <StyleTab widgetType={widgetType} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

export default function WidgetSettingsModal({ widgetType, onClose }) {
  const [settingsUrl, setSettingsUrl] = useState(null);
  const [ready,       setReady]       = useState(false);

  useEffect(() => {
    fetch(`/widgets/${widgetType}/manifest.json`)
      .then(r => r.ok ? r.json() : null)
      .then(manifest => {
        setSettingsUrl(manifest?.settingsPages?.widget || null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [widgetType]);

  if (!ready) return null;

  if (settingsUrl) return <IframeModal url={settingsUrl} onClose={onClose} />;
  return <TabModal widgetType={widgetType} onClose={onClose} />;
}
