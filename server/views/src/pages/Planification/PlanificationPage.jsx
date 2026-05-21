import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import { getLeafZones } from '../../utils/layoutTree';
import { deepClone } from '../../utils';
import SeqForm from './SeqForm';
import ZoneTabs from './ZoneTabs';
import ZoneItemsList from './ZoneItemsList';
import SourceSidebar from './SourceSidebar';
import DashSidebar from '../Dashboard/DashSidebar';
import Button from '../../components/ui/Button';
import AlertContainer from '../../components/ui/Alert';
import { showAlert } from '../../components/ui/Alert';
import WidgetSettingsModal from './WidgetSettingsModal';

const EMPTY_SEQ = {
  name: '', scheduleType: 'continue', startDate: '', endDate: '',
  startTime: '', endTime: '', layoutId: 'fullscreen',
  loopDurationSec: 10,
  loopOrder: 0,
  zones: {
    zone1: { type: 'playlist', items: [] },
    audio: { type: 'playlist', items: [] },
  },
};

export default function PlanificationPage() {
  const { allSequences, layouts, mediaFiles, setAllSequences, reloadSequences } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentSeqId, setCurrentSeqId] = useState(null);
  const [editingSeq, setEditingSeq] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [widgetSettingsType, setWidgetSettingsType] = useState(null);

  useEffect(() => {
    const seqId = searchParams.get('seq');
    const create = searchParams.get('create');
    if (seqId) {
      setCurrentSeqId(seqId);
      setSearchParams({}, { replace: true });
    } else if (create) {
      startNewDraft();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const startNewDraft = () => {
    setCurrentSeqId(null);
    setEditingSeq(deepClone(EMPTY_SEQ));
  };

  const existingSeq = allSequences.find(s => s.id === currentSeqId) || null;

  useEffect(() => {
    if (!currentSeqId) return;
    if (existingSeq) {
      setEditingSeq(deepClone(existingSeq));
      return;
    }
    setCurrentSeqId(null);
    setEditingSeq(null);
  }, [currentSeqId, existingSeq]);

  useEffect(() => {
    if (editingSeq || currentSeqId || !allSequences.length) return;
    setCurrentSeqId(allSequences[0].id);
  }, [editingSeq, currentSeqId, allSequences]);

  const seq = editingSeq;
  const isNew = !!editingSeq && !editingSeq.id;

  const getLayoutRoot = useCallback((s) => {
    const tpl = layouts[s.layoutId] || layouts['fullscreen'] || { label: 'Plein ecran', root: { id: 'zone1', flex: 1 } };
    return s.customLayout || tpl.root;
  }, [layouts]);

  useEffect(() => {
    if (!seq) return;
    const root = getLayoutRoot(seq);
    const leaves = [...getLeafZones(root), { id: 'audio' }];
    if (!selectedZoneId || !leaves.find(z => z.id === selectedZoneId)) {
      setSelectedZoneId(leaves[0]?.id || 'zone1');
    }
  }, [seq, selectedZoneId, getLayoutRoot]);

  const updateSeq = useCallback((updated) => {
    setEditingSeq(updated);
  }, []);

  const saveSeq = useCallback(async (updated) => {
    if (isNew || !updated.id) {
      const r = await api('/api/sequences', {
        method: 'POST',
        body: JSON.stringify(updated),
      });
      if (r?.id) {
        setAllSequences([...allSequences, r]);
        setCurrentSeqId(r.id);
        setEditingSeq(deepClone(r));
        showAlert('Sequence creee');
      }
    } else {
      const r = await api(`/api/sequences/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      if (r) {
        setAllSequences(allSequences.map(s => s.id === r.id ? r : s));
        setEditingSeq(deepClone(r));
        showAlert('Sequence enregistree');
      }
    }
  }, [isNew, allSequences, setAllSequences]);

  const root = seq ? getLayoutRoot(seq) : null;
  const leaves = root ? [...getLeafZones(root), { id: 'audio' }] : [];
  const isAudioZone = selectedZoneId === 'audio';

  const handleSelectSeq = (seqId) => {
    setCurrentSeqId(seqId);
  };

  const handleEditSeq = (seqId) => {
    setCurrentSeqId(seqId);
  };

  // Reassign all loopOrder values based on array position
  const persistOrder = useCallback(async (orderedIds) => {
    const updates = orderedIds.map((id, idx) =>
      api(`/api/sequences/${id}`, { method: 'PUT', body: JSON.stringify({ loopOrder: idx }) })
    );
    await Promise.all(updates);
    await reloadSequences();
    // Update editingSeq if it was reordered
    const newIdx = orderedIds.indexOf(editingSeq?.id);
    if (newIdx >= 0) setEditingSeq(prev => (prev ? { ...prev, loopOrder: newIdx } : prev));
  }, [reloadSequences, editingSeq]);

  const getOrderedContinueIds = useCallback(() => {
    return [...allSequences]
      .filter(s => s.scheduleType === 'continue')
      .sort((a, b) => (Number(a.loopOrder) || 0) - (Number(b.loopOrder) || 0) || (a.createdAt || 0) - (b.createdAt || 0))
      .map(s => s.id);
  }, [allSequences]);

  const swapSequenceOrder = useCallback(async (seqIdA, seqIdB) => {
    const ids = getOrderedContinueIds();
    const idxA = ids.indexOf(seqIdA);
    const idxB = ids.indexOf(seqIdB);
    if (idxA < 0 || idxB < 0) return;
    // Move A to B's position
    ids.splice(idxA, 1);
    const insertAt = ids.indexOf(seqIdB);
    ids.splice(idxA < idxB ? insertAt + 1 : insertAt, 0, seqIdA);
    await persistOrder(ids);
  }, [getOrderedContinueIds, persistOrder]);

  const moveSequenceById = useCallback(async (seqId, direction) => {
    const ids = getOrderedContinueIds();
    const index = ids.indexOf(seqId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    // Swap positions
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    await persistOrder(ids);
  }, [getOrderedContinueIds, persistOrder]);

  return (
    <div className="flex gap-4 flex-1 overflow-hidden p-4 max-lg:flex-col">
      <AlertContainer />
      <DashSidebar
        sequences={allSequences}
        activeSeqId={currentSeqId}
        selectedSeqId={currentSeqId}
        layouts={layouts}
        onSelect={handleSelectSeq}
        onEdit={handleEditSeq}
        onNew={startNewDraft}
        onDeleted={reloadSequences}
        reorderEnabled
        onReorder={swapSequenceOrder}
        onMoveSequence={moveSequenceById}
      />
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-w-0">
        {seq ? (
          <>
            <SeqForm
              seq={seq}
              isNew={isNew}
              layouts={layouts}
              onChange={updateSeq}
              onSave={saveSeq}
              getLayoutRoot={getLayoutRoot}
            />
            <ZoneTabs
              leaves={leaves}
              selectedZoneId={selectedZoneId}
              onSelect={setSelectedZoneId}
            />
            <div className="bg-gradient-to-br from-bg-card to-bg-card2 border border-border rounded-xl p-3 flex-1 flex flex-col min-h-[200px]">
              <ZoneItemsList
                seq={seq}
                selectedZoneId={selectedZoneId || 'zone1'}
                isAudioZone={isAudioZone}
                onSave={updateSeq}
              />
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-bg-card to-bg-card2 border border-border rounded-xl text-center py-16 text-text-dim">
            <p className="mb-4">Selectionnez une sequence depuis le Dashboard ou creez-en une nouvelle</p>
            <Button onClick={startNewDraft}>+ Nouvelle sequence</Button>
          </div>
        )}
      </div>
      <SourceSidebar
        mediaFiles={mediaFiles}
        seq={seq}
        selectedZoneId={selectedZoneId || 'zone1'}
        isAudioZone={isAudioZone}
        onSave={updateSeq}
        onWidgetSettings={(widgetType) => setWidgetSettingsType(widgetType)}
      />
      {widgetSettingsType && (
        <WidgetSettingsModal
          widgetType={widgetSettingsType}
          onClose={() => setWidgetSettingsType(null)}
        />
      )}
    </div>
  );
}
