import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import LayoutPicker from './LayoutPicker';
import LayoutEditor from './LayoutEditor';
import { deepClone } from '../../../utils';
import { getNextZoneId } from '../../../utils/layoutTree';

export default function LayoutModal({ seq, layouts, getLayoutRoot, onClose, onApply }) {
  const tpl = layouts[seq.layoutId] || layouts['fullscreen'];
  const [layoutId, setLayoutId] = useState(seq.layoutId);
  const [editRoot, setEditRoot] = useState(() => deepClone(seq.customLayout || tpl.root));

  const handlePick = (id) => {
    setLayoutId(id);
    const newTpl = layouts[id] || layouts['fullscreen'];
    setEditRoot(deepClone(newTpl.root));
  };

  const handleAddZone = () => {
    const newId = getNextZoneId(editRoot);
    if (editRoot.id) {
      setEditRoot({
        direction: 'row',
        flex: 1,
        children: [
          { id: editRoot.id, flex: editRoot.flex },
          { id: newId, flex: 1 },
        ],
      });
    } else {
      const clone = deepClone(editRoot);
      clone.children.push({ id: newId, flex: 1 });
      setEditRoot(clone);
    }
  };

  const handleReset = () => {
    const t = layouts[layoutId] || layouts['fullscreen'];
    setEditRoot(deepClone(t.root));
  };

  const handleApply = () => {
    const defaultTpl = layouts[layoutId] || layouts['fullscreen'];
    const isCustom = JSON.stringify(editRoot) !== JSON.stringify(defaultTpl.root);
    onApply(layoutId, isCustom ? deepClone(editRoot) : null);
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4">Choisir un layout</h2>
      <LayoutPicker
        layouts={layouts}
        selectedId={layoutId}
        onPick={handlePick}
      />
      <hr className="border-border my-4" />
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[0.95rem] m-0">Ajuster les zones</h3>
        <Button sm variant="secondary" onClick={handleAddZone}>+ Zone</Button>
      </div>
      <LayoutEditor
        root={editRoot}
        onChange={setEditRoot}
      />
      <div className="flex gap-2 justify-end mt-3">
        <Button sm variant="secondary" onClick={handleReset}>Reinitialiser</Button>
        <Button sm onClick={handleApply}>Appliquer</Button>
      </div>
    </Modal>
  );
}
