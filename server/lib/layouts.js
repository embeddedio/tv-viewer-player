// Layout templates — recursive tree model
// LayoutNode = leaf { id, flex } or container { direction, flex, children: [LayoutNode] }
const LAYOUT_TEMPLATES = {
  "fullscreen": {
    label: "Plein ecran",
    root: { id: "zone1", flex: 1 }
  },
  "two-columns": {
    label: "2 zones horizontales",
    root: {
      direction: "row", flex: 1,
      children: [
        { id: "zone1", flex: 1 },
        { id: "zone2", flex: 1 }
      ]
    }
  },
  "two-rows": {
    label: "2 zones verticales",
    root: {
      direction: "column", flex: 1,
      children: [
        { id: "zone1", flex: 1 },
        { id: "zone2", flex: 1 }
      ]
    }
  },
  "grid-2x2": {
    label: "4 zones (2x2)",
    root: {
      direction: "column", flex: 1,
      children: [
        {
          direction: "row", flex: 1,
          children: [
            { id: "zone1", flex: 1 },
            { id: "zone2", flex: 1 }
          ]
        },
        {
          direction: "row", flex: 1,
          children: [
            { id: "zone3", flex: 1 },
            { id: "zone4", flex: 1 }
          ]
        }
      ]
    }
  }
};

/** Get all leaf zones from a layout tree */
const getLeafZones = (node) => {
  if (!node) return [];
  if (node.id) return [node];
  if (!node.children) return [];
  return node.children.flatMap(getLeafZones);
};

module.exports = { LAYOUT_TEMPLATES, getLeafZones };
