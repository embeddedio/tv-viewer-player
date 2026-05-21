import React, { useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import ZoneContent from "./ZoneContent";
import AudioZonePlayer from "./AudioZonePlayer";
import { LAYOUT_TEMPLATES, type LayoutId, type LayoutNode, type ActiveDisplay } from "../layouts";

interface LayoutRendererProps {
  layoutId: LayoutId | null;
  activeDisplay: ActiveDisplay | null;
  tickerConfig: {
    heightPercent: number;
    scale: number;
    speed: number;
    itemGap: number;
    items: any[];
  };
  tickerItems: any[];
  logoInfo: { url: string; name: string } | null;
  baseUrl: string;
  rotation?: string;
}

function renderNode(
  node: LayoutNode,
  zones: Record<string, any>,
  props: Omit<LayoutRendererProps, "layoutId" | "activeDisplay">,
  path: string = "root"
): React.ReactNode {
  if ("id" in node) {
    // Leaf zone
    const zoneConfig = zones[node.id] || { type: "empty" };
    return (
      <View key={node.id} style={[styles.zone, { flex: node.flex }]}>
        <ZoneContent
          zoneConfig={zoneConfig}
          tickerConfig={props.tickerConfig}
          tickerItems={props.tickerItems}
          logoInfo={props.logoInfo}
          baseUrl={props.baseUrl}
          rotation={props.rotation}
        />
      </View>
    );
  }

  // Container node
  const flexDirection = node.direction === "row" ? "row" : "column";
  return (
    <View key={path} style={{ flex: node.flex, flexDirection }}>
      {node.children.map((child, i) =>
        renderNode(child, zones, props, `${path}-${i}`)
      )}
    </View>
  );
}

export default function LayoutRenderer({
  layoutId,
  activeDisplay,
  tickerConfig,
  tickerItems,
  logoInfo,
  baseUrl,
  rotation = "landscape-left",
}: LayoutRendererProps) {
  const actualLayoutId = layoutId || "fullscreen";
  const template = LAYOUT_TEMPLATES[actualLayoutId as LayoutId];

  if (!template) {
    return null;
  }

  const root = (activeDisplay as any)?.customLayout || template.root;
  const zones = activeDisplay?.zones || {};
  // Stabilize props reference to avoid unnecessary re-renders of ZoneContent
  const prevPropsRef = useRef({ tickerConfig, tickerItems, logoInfo, baseUrl, rotation });
  const stableProps = useMemo(() => {
    const prev = prevPropsRef.current;
    const same = prev.baseUrl === baseUrl &&
      prev.rotation === rotation &&
      prev.logoInfo?.url === logoInfo?.url &&
      prev.tickerConfig === tickerConfig;
    if (same) return prev;
    const next = { tickerConfig, tickerItems, logoInfo, baseUrl, rotation };
    prevPropsRef.current = next;
    return next;
  }, [tickerConfig, tickerItems, logoInfo, baseUrl, rotation]);
  const props = stableProps;

  const audioZone = zones["audio"];

  return (
    <View style={styles.container}>
      {renderNode(root, zones, props)}
      {audioZone?.items?.length ? (
        <AudioZonePlayer zoneConfig={audioZone} baseUrl={baseUrl} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    flexDirection: "row",
  },
  zone: {
    overflow: "hidden",
  },
});
