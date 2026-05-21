import { useState, useCallback, useMemo, useEffect } from 'react';
import Button from '../../components/ui/Button';
import { showAlert } from '../../components/ui/Alert';
import { DAY_OPTIONS } from '../../constants';
import { deepClone } from '../../utils';
import LayoutMiniPreview from '../../components/shared/LayoutMiniPreview';
import LayoutModal from './LayoutModal/LayoutModal';

function getValidationErrors(seq) {
  const errors = [];
  if (!seq.name) errors.push('nom');
  if (seq.scheduleType === 'custom') {
    if (!seq.startDate) errors.push('date debut');
    if (!seq.endDate) errors.push('date fin');
    if (!seq.startTime) errors.push('heure debut');
    if (!seq.endTime) errors.push('heure fin');
  } else {
    const sec = Math.max(0, parseInt(String(seq.loopDurationSec || 0), 10) || 0);
    if (sec < 1) errors.push('duree (HH/MM/SS)');
  }
  return errors;
}

function secondsToParts(totalSec) {
  const value = Math.max(0, parseInt(String(totalSec || 0), 10) || 0);
  const hh = Math.floor(value / 3600);
  const mm = Math.floor((value % 3600) / 60);
  const ss = value % 60;
  return { hh, mm, ss };
}

export default function SeqForm({
  seq,
  isNew,
  layouts,
  onChange,
  onSave,
  getLayoutRoot,
}) {
  const [draft, setDraft] = useState(() => deepClone(seq));
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  const seqKey = seq.id || (isNew ? '_new' : null);

  useEffect(() => {
    setDraft(deepClone(seq));
  }, [seqKey, seq]);

  const errors = useMemo(() => getValidationErrors(draft), [draft]);

  const update = useCallback((partial) => {
    setDraft(prev => {
      const updated = { ...prev, ...partial };
      onChange(updated);
      return updated;
    });
  }, [onChange]);

  const handleSave = async () => {
    if (errors.length) {
      showAlert('Veuillez remplir : ' + errors.join(', '), 'warning');
      return;
    }
    await onSave(draft);
  };

  const handleLayoutApply = (layoutId, customLayout) => {
    const updated = { ...draft, layoutId, customLayout };
    setDraft(updated);
    onChange(updated);
    setShowLayoutModal(false);
  };

  const root = getLayoutRoot(draft);
  const duration = useMemo(() => secondsToParts(draft.loopDurationSec ?? 10), [draft.loopDurationSec]);

  const handleDurationPart = (part, raw) => {
    const parsed = Math.max(0, parseInt(String(raw || 0), 10) || 0);
    const next = { ...duration, [part]: parsed };
    const total = (next.hh * 3600) + (next.mm * 60) + next.ss;
    update({ loopDurationSec: Math.max(1, total) });
  };

  const inputClass = (field) =>
    `w-full px-2 py-1 bg-black/30 border rounded-lg text-text text-[0.8rem] focus:outline-none focus:border-accent ${
      draft.scheduleType === 'custom' && !draft[field] ? 'border-yellow' : 'border-border'
    }`;

  return (
    <>
      <div className="bg-gradient-to-br from-bg-card to-bg-card2 border border-border rounded-xl p-3">
        <h2 className={`text-sm m-0 mb-2 ${!draft.name ? 'text-text-dim italic' : ''}`}>
          {draft.name || 'Sans nom'}
        </h2>

        <div className="flex gap-3">
          {/* Champs formulaire */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div>
                <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Nom</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="Nom de la sequence"
                  className={inputClass('name')}
                />
              </div>
              <div>
                <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Type</label>
                <select
                  value={draft.scheduleType}
                  onChange={e => {
                    const nextType = e.target.value;
                    if (nextType === 'continue') {
                      update({ scheduleType: nextType, loopDurationSec: Math.max(1, parseInt(String(draft.loopDurationSec || 10), 10) || 10) });
                    } else {
                      update({ scheduleType: nextType });
                    }
                  }}
                  className="w-full px-2 py-1.5 bg-black/30 border border-border rounded-lg text-text text-[0.8rem] focus:outline-none focus:border-accent"
                >
                  <option value="continue">Continue</option>
                  <option value="custom">Personnalise</option>
                </select>
              </div>
              {draft.scheduleType === 'custom' ? (
                <>
                  <div>
                    <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Date debut</label>
                    <input type="date" value={draft.startDate} onChange={e => update({ startDate: e.target.value })} onClick={e => e.target.showPicker()} className={inputClass('startDate')} />
                  </div>
                  <div>
                    <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Date fin</label>
                    <input type="date" value={draft.endDate} onChange={e => update({ endDate: e.target.value })} onClick={e => e.target.showPicker()} className={inputClass('endDate')} />
                  </div>
                  <div>
                    <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Heure debut</label>
                    <input type="time" value={draft.startTime} onChange={e => update({ startTime: e.target.value })} onClick={e => e.target.showPicker()} className={inputClass('startTime')} />
                  </div>
                  <div>
                    <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Heure fin</label>
                    <input type="time" value={draft.endTime} onChange={e => update({ endTime: e.target.value })} onClick={e => e.target.showPicker()} className={inputClass('endTime')} />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block mb-0.5 text-text-muted text-[0.7rem] font-medium">Duree d'affichage (HH:MM:SS)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={0}
                      value={duration.hh}
                      onChange={e => handleDurationPart('hh', e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-border rounded-lg text-text text-[0.8rem] focus:outline-none focus:border-accent text-center"
                      placeholder="HH"
                    />
                    <input
                      type="number"
                      min={0}
                      value={duration.mm}
                      onChange={e => handleDurationPart('mm', e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-border rounded-lg text-text text-[0.8rem] focus:outline-none focus:border-accent text-center"
                      placeholder="MM"
                    />
                    <input
                      type="number"
                      min={0}
                      value={duration.ss}
                      onChange={e => handleDurationPart('ss', e.target.value)}
                      className="w-full px-2 py-1 bg-black/30 border border-border rounded-lg text-text text-[0.8rem] focus:outline-none focus:border-accent text-center"
                      placeholder="SS"
                    />
                  </div>
                </div>
              )}
            </div>

            {draft.scheduleType === 'custom' && (
              <div className="mt-1.5">
                <label className="block mb-0.5 text-text-muted text-[0.7rem]">Jours actifs</label>
                <div className="flex gap-1 flex-wrap">
                  {DAY_OPTIONS.map(d => {
                    const checked = (draft.days || []).includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md border text-[0.7rem] ${
                          checked ? 'bg-accent/15 border-accent' : 'border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={() => {
                            const days = checked
                              ? (draft.days || []).filter(id => id !== d.id)
                              : [...(draft.days || []), d.id];
                            update({ days });
                          }}
                        />
                        {d.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Layout preview a droite */}
          <div className="flex flex-col items-center gap-2 pl-3 border-l border-border">
            <label className="text-[0.7rem] text-text-muted whitespace-nowrap">Layout</label>
            <LayoutMiniPreview root={root} onClick={() => setShowLayoutModal(true)} className="!w-24 !h-16" />
            <span className="text-[0.6rem] text-text-dim">Cliquer pour modifier</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          {errors.length > 0 && (
            <span className="text-yellow text-[0.7rem]">&#9888; {errors.join(', ')}</span>
          )}
          <Button onClick={handleSave} disabled={errors.length > 0} className="ml-auto px-8">
            {isNew ? 'Creer' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {showLayoutModal && (
        <LayoutModal
          seq={draft}
          layouts={layouts}
          getLayoutRoot={getLayoutRoot}
          onClose={() => setShowLayoutModal(false)}
          onApply={handleLayoutApply}
        />
      )}
    </>
  );
}
