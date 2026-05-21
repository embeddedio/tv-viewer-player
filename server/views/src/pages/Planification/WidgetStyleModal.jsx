import { useState } from 'react';

function Slider({ label, value, min, max, step, unit, onChange, defaultValue }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-text">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-mono text-accent">{value}{unit}</span>
          <button
            onClick={() => onChange(defaultValue)}
            className="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/5 border border-border text-text-dim hover:text-text hover:border-border/60"
            title="Réinitialiser"
          >
            reset
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent cursor-pointer"
      />
      <div className="flex justify-between text-[0.6rem] text-text-dim">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function WidgetStyleModal({ item, onClose, onSave }) {
  const [fontScale,    setFontScale]    = useState(item.fontScale    ?? 1.0);
  const [logoSize,     setLogoSize]     = useState(item.logoSize     ?? 100);
  const [headerWeight, setHeaderWeight] = useState(item.headerWeight ?? 2.5);

  const handleSave = () => {
    onSave({ fontScale, logoSize, headerWeight });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border" style={{ backgroundColor: '#152238' }}>
          <div>
            <h2 className="text-base font-bold text-white">Paramètres visuels</h2>
            <p className="text-xs text-white/60 mt-0.5">Ajuster l'apparence du widget</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-lg font-bold"
          >
            &times;
          </button>
        </div>

        {/* Sliders */}
        <div className="px-5 py-5 flex flex-col gap-5">
          <Slider
            label="Échelle des polices"
            value={fontScale}
            min={0.5}
            max={2.0}
            step={0.1}
            unit="×"
            defaultValue={1.0}
            onChange={setFontScale}
          />
          <Slider
            label="Taille du logo"
            value={logoSize}
            min={30}
            max={150}
            step={5}
            unit="%"
            defaultValue={100}
            onChange={setLogoSize}
          />
          <Slider
            label="Hauteur du header"
            value={headerWeight}
            min={1.0}
            max={5.0}
            step={0.5}
            unit=" lignes"
            defaultValue={2.5}
            onChange={setHeaderWeight}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border text-text-dim hover:text-text hover:border-border/60"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-white font-semibold hover:bg-accent/80"
          >
            Enregistrer
          </button>
        </div>

      </div>
    </div>
  );
}
