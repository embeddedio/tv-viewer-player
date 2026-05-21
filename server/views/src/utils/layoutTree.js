export function getLeafZones(node) {
  if (!node) return [];
  if (node.id) return [node];
  if (!node.children) return [];
  return node.children.flatMap(getLeafZones);
}

export function getNodeByPath(root, path) {
  if (path === '' || path === undefined || path === null) return root;
  const parts = path.split('.').map(Number);
  let node = root;
  for (const p of parts) {
    if (!node.children) return node;
    node = node.children[p];
  }
  return node;
}

export function getNextZoneId(root) {
  const leaves = getLeafZones(root);
  const nums = leaves.map(l => parseInt((l.id || '').replace('zone', '')) || 0);
  return 'zone' + (Math.max(0, ...nums) + 1);
}

export function splitAtPath(root, path, direction) {
  const editRoot = { ...root };
  const node = getNodeByPath(editRoot, path || undefined);
  if (!node || !node.id) return editRoot;

  const newId = getNextZoneId(editRoot);
  const newContainer = {
    direction,
    flex: node.flex,
    children: [
      { id: node.id, flex: 1 },
      { id: newId, flex: 1 },
    ],
  };

  const parts = path === '' ? [] : path.split('.').map(Number);
  if (parts.length === 0) {
    return newContainer;
  }
  const parentPath = parts.slice(0, -1).join('.');
  const childIdx = parts[parts.length - 1];
  const parent = getNodeByPath(editRoot, parentPath || undefined);
  if (parent.children) {
    parent.children[childIdx] = newContainer;
  }
  return editRoot;
}

export function removeAtPath(root, path) {
  let editRoot = { ...root };
  const parts = path === '' ? [] : path.split('.').map(Number);
  if (parts.length === 0) return editRoot;

  const parentPath = parts.slice(0, -1).join('.');
  const childIdx = parts[parts.length - 1];
  const parent = getNodeByPath(editRoot, parentPath || undefined);
  if (!parent || !parent.children) return editRoot;

  parent.children.splice(childIdx, 1);

  if (parent.children.length === 1) {
    const remaining = parent.children[0];
    remaining.flex = parent.flex;
    if (parentPath === '' || parentPath === undefined) {
      editRoot = remaining;
    } else {
      const gpParts = parentPath.split('.').map(Number);
      const gpPath = gpParts.slice(0, -1).join('.');
      const gpIdx = gpParts[gpParts.length - 1];
      const gp = gpPath === '' ? editRoot : getNodeByPath(editRoot, gpPath);
      if (gp && gp.children) {
        gp.children[gpIdx] = remaining;
      } else {
        editRoot = remaining;
      }
    }
  }

  return editRoot;
}
