// Layout templates — recursive tree model
// LayoutNode = leaf { id, flex } or container { direction, flex, children: [LayoutNode] }

export type LayoutNode =
  | { id: string; flex: number }
  | { direction: "row" | "column"; flex: number; children: LayoutNode[] };

export const LAYOUT_TEMPLATES = {
  fullscreen: {
    label: "Plein ecran",
    root: { id: "zone1", flex: 1 } as LayoutNode
  },
  "two-columns": {
    label: "2 zones horizontales",
    root: {
      direction: "row", flex: 1,
      children: [
        { id: "zone1", flex: 1 },
        { id: "zone2", flex: 1 }
      ]
    } as LayoutNode
  },
  "two-rows": {
    label: "2 zones verticales",
    root: {
      direction: "column", flex: 1,
      children: [
        { id: "zone1", flex: 1 },
        { id: "zone2", flex: 1 }
      ]
    } as LayoutNode
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
    } as LayoutNode
  }
};

export type LayoutId = keyof typeof LAYOUT_TEMPLATES;

export type ZoneType = "playlist" | "ticker" | "logo" | "empty";

export interface ZoneMediaItem {
  mediaName: string;
  originalName?: string;
  duration: number;
  muted?: boolean;
}

export interface ZoneWidgetItem {
  widgetType: string;
  duration: number;
  variant?: 'simple' | 'bkam' | 'combined';
  theme?: string;
  messages?: string[];
  direction?: 'ltr' | 'rtl';
  fontSize?: number;
  speed?: number;
  logoWidth?: number;
  headerHeight?: number;
  fontScale?: number;    // multiplicateur police (défaut 1.0)
  logoSize?: number;     // taille logo en % (défaut 100)
  headerWeight?: number; // poids header en unités-ligne (défaut 2.5)
}

export type ZoneItem = ZoneMediaItem | ZoneWidgetItem;

export interface ZoneConfig {
  type: ZoneType;
  items?: ZoneItem[];
  fileNames?: string[];
}

export interface LayoutTemplate {
  label: string;
  root: LayoutNode;
}

export interface ActiveDisplay {
  layoutId: LayoutId;
  zones: Record<string, ZoneConfig>;
  customLayout?: LayoutNode | null;
}

/** Get all leaf zones from a layout tree */
export function getLeafZones(node: LayoutNode): Array<{ id: string; flex: number }> {
  if ("id" in node) return [node];
  return node.children.flatMap(getLeafZones);
}
