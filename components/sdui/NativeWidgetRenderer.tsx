import React from 'react';
import { View } from 'react-native';
import type { BindingContext } from './types';
import type { ZoneWidgetItem } from '../../layouts';
import { useWidgetData } from './useWidgetData';
import { renderNode } from './componentRegistry';

interface NativeWidgetRendererProps {
  baseUrl: string;
  widgetType: string;
  widgetItem: ZoneWidgetItem;
  fallback: React.ReactElement;
}

function NativeWidgetRenderer({ baseUrl, widgetType, widgetItem, fallback }: NativeWidgetRendererProps) {
  const { uiDef, data, sources, loading, error, layout, onLayout, computed } = useWidgetData(
    baseUrl,
    widgetType,
    widgetItem as Record<string, any>,
  );

  // ui.json not found → render fallback (WebView)
  if (error) return fallback;

  // Loading ui.json → black screen (parent has bg #000)
  if (loading || !uiDef) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  const now = new Date();
  const ctx: BindingContext = {
    $data: data,
    $sources: sources,
    $env: {
      baseUrl,
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      locale: 'fr-FR',
    },
    $props: widgetItem as Record<string, any>,
    $layout: { ...layout, contentWidth: layout.width },
    $computed: computed,
  };

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {renderNode(uiDef.root, ctx, 'root')}
    </View>
  );
}

export default React.memo(NativeWidgetRenderer);
