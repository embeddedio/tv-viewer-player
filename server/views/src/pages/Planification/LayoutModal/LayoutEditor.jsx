import { useCallback } from 'react';
import { deepClone } from '../../../utils';
import { getLeafZones, getNodeByPath, getNextZoneId } from '../../../utils/layoutTree';
import { ZONE_COLORS } from '../../../constants';
import LayoutEditorZone from './LayoutEditorZone';
import LayoutDivider from './LayoutDivider';

export default function LayoutEditor({ root, onChange }) {
  const totalLeaves = getLeafZones(root).length;

  const handleSplit = useCallback((path, direction) => {
    const clone = deepClone(root);
    const parts = path === '' ? [] : path.split('.').map(Number);
    const node = getNodeByPath(clone, path || undefined);
    if (!node || !node.id) return;

    const newId = getNextZoneId(clone);
    const newContainer = {
      direction,
      flex: node.flex,
      children: [
        { id: node.id, flex: 1 },
        { id: newId, flex: 1 },
      ],
    };

    if (parts.length === 0) {
      onChange(newContainer);
      return;
    }
    const parentPath = parts.slice(0, -1).join('.');
    const childIdx = parts[parts.length - 1];
    const parent = getNodeByPath(clone, parentPath || undefined);
    if (parent.children) parent.children[childIdx] = newContainer;
    onChange(clone);
  }, [root, onChange]);

  const handleRemove = useCallback((path) => {
    if (totalLeaves <= 1) return;
    let clone = deepClone(root);
    const parts = path === '' ? [] : path.split('.').map(Number);
    if (parts.length === 0) return;

    const parentPath = parts.slice(0, -1).join('.');
    const childIdx = parts[parts.length - 1];
    const parent = getNodeByPath(clone, parentPath || undefined);
    if (!parent || !parent.children) return;

    parent.children.splice(childIdx, 1);

    if (parent.children.length === 1) {
      const remaining = parent.children[0];
      remaining.flex = parent.flex;
      if (parentPath === '' || parentPath === undefined) {
        clone = remaining;
      } else {
        const gpParts = parentPath.split('.').map(Number);
        const gpPath = gpParts.slice(0, -1).join('.');
        const gpIdx = gpParts[gpParts.length - 1];
        const gp = gpPath === '' ? clone : getNodeByPath(clone, gpPath);
        if (gp?.children) {
          gp.children[gpIdx] = remaining;
        } else {
          clone = remaining;
        }
      }
    }
    onChange(clone);
  }, [root, totalLeaves, onChange]);

  const handlePctChange = useCallback((path, newPct) => {
    const clone = deepClone(root);
    const parts = path === '' ? [] : path.split('.').map(Number);
    if (parts.length === 0) return;

    const parentPath = parts.slice(0, -1).join('.');
    const childIdx = parts[parts.length - 1];
    const parent = getNodeByPath(clone, parentPath || undefined);
    if (!parent?.children) return;

    let pct = Math.max(5, Math.min(95, newPct));
    const totalFlex = parent.children.reduce((s, c) => s + c.flex, 0);
    const oldFlex = parent.children[childIdx].flex;
    const newFlex = (pct / 100) * totalFlex;
    const remainingOldFlex = totalFlex - oldFlex;
    const remainingNewFlex = totalFlex - newFlex;

    parent.children[childIdx].flex = Math.round(newFlex * 10) / 10;
    if (remainingOldFlex > 0) {
      parent.children.forEach((c, i) => {
        if (i !== childIdx) {
          c.flex = Math.max(0.3, Math.round((c.flex / remainingOldFlex) * remainingNewFlex * 10) / 10);
        }
      });
    }
    onChange(clone);
  }, [root, onChange]);

  const handleDividerDrag = useCallback((parentPath, divIdx, flexA, flexB) => {
    const clone = deepClone(root);
    const parent = getNodeByPath(clone, parentPath || undefined);
    if (!parent?.children) return;
    parent.children[divIdx].flex = flexA;
    parent.children[divIdx + 1].flex = flexB;
    onChange(clone);
  }, [root, onChange]);

  const counter = { value: 0 };

  return (
    <div className="w-full h-[200px] border border-border rounded-lg flex overflow-hidden my-4 relative">
      <EditorNode
        node={root}
        path=""
        counter={counter}
        totalLeaves={totalLeaves}
        parentDir={undefined}
        root={root}
        onSplit={handleSplit}
        onRemove={handleRemove}
        onPctChange={handlePctChange}
        onDividerDrag={handleDividerDrag}
      />
    </div>
  );
}

function EditorNode({
  node, path, counter, totalLeaves, parentDir, root,
  onSplit, onRemove, onPctChange, onDividerDrag,
}) {
  if (node.id) {
    const idx = counter.value++;
    const parentNode = path === '' ? null : getNodeByPath(root, path.split('.').slice(0, -1).join('.') || undefined);
    let pctValue = 100;
    if (parentNode?.children) {
      const totalFlex = parentNode.children.reduce((s, c) => s + c.flex, 0);
      pctValue = Math.round(node.flex / totalFlex * 100);
    }
    const pctLabel = parentDir === 'row' ? 'W' : parentDir === 'column' ? 'H' : '';

    return (
      <LayoutEditorZone
        index={idx}
        zoneId={node.id}
        path={path}
        flex={node.flex}
        color={ZONE_COLORS[idx % ZONE_COLORS.length]}
        canRemove={totalLeaves > 1}
        pctLabel={pctLabel}
        pctValue={pctValue}
        onSplit={onSplit}
        onRemove={onRemove}
        onPctChange={onPctChange}
      />
    );
  }

  const isCol = node.direction === 'column';

  return (
    <div
      className="flex min-w-0 min-h-0"
      style={{ flexDirection: isCol ? 'column' : 'row', flex: node.flex }}
    >
      {node.children.flatMap((child, i) => {
        const childPath = path === '' ? `${i}` : `${path}.${i}`;
        const elements = [
          <EditorNode
            key={childPath}
            node={child}
            path={childPath}
            counter={counter}
            totalLeaves={totalLeaves}
            parentDir={node.direction}
            root={root}
            onSplit={onSplit}
            onRemove={onRemove}
            onPctChange={onPctChange}
            onDividerDrag={onDividerDrag}
          />,
        ];
        if (i < node.children.length - 1) {
          elements.push(
            <LayoutDivider
              key={`div-${i}`}
              parentPath={path}
              divIdx={i}
              isVertical={isCol}
              parentNode={node}
              onDragEnd={onDividerDrag}
            />
          );
        }
        return elements;
      })}
    </div>
  );
}
