import React from "react";
import { WebView } from "react-native-webview";
import { StyleSheet, View } from "react-native";
import type { ZoneWidgetItem } from "../layouts";

interface WidgetWebViewProps {
  baseUrl: string;
  widgetType: string;
  widgetItem?: ZoneWidgetItem;
}

function WidgetWebView({ baseUrl, widgetType, widgetItem }: WidgetWebViewProps) {
  const params = new URLSearchParams();
  if (widgetItem?.variant)     params.set('variant',     widgetItem.variant);
  if (widgetItem?.theme)       params.set('theme',       widgetItem.theme);
  if (widgetItem?.fontScale)   params.set('fontScale',   String(widgetItem.fontScale));
  if (widgetItem?.logoSize)    params.set('logoSize',    String(widgetItem.logoSize));
  if (widgetItem?.headerWeight) params.set('headerWeight', String(widgetItem.headerWeight));
  if (widgetItem?.city)         params.set('city',         widgetItem.city);
  const qs  = params.toString();
  const uri = `${baseUrl}/widgets/${widgetType}/${qs ? '?' + qs : ''}`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        javaScriptEnabled
        scalesPageToFit={false}
        scrollEnabled={false}
      />
    </View>
  );
}

export default React.memo(WidgetWebView);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
