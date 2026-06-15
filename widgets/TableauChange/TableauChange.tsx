import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useWidgetBridge } from '../../contexts/WidgetBridgeContext';

type Variant = 'simple' | 'bkam' | 'combined';

interface Props {
  baseUrl: string;
  variant?: Variant;
  theme?: string;
  fontScale?: number;
  logoSize?: number;
  headerWeight?: number;
}

export default function TableauChange({ baseUrl, variant = 'simple', theme = 'default', fontScale, logoSize, headerWeight }: Props) {
  const { logoUrl } = useWidgetBridge();

  const uri =
    baseUrl + '/widgets/tableau-change/index.html' +
    '?variant='     + encodeURIComponent(variant) +
    '&theme='       + encodeURIComponent(theme) +
    '&logo='        + encodeURIComponent(logoUrl || '') +
    '&fontScale='   + (fontScale    || 0) +
    '&logoSize='    + (logoSize     || 0) +
    '&headerWeight='+ (headerWeight || 0);

  return (
    <View style={s.root}>
      <WebView
        source={{ uri }}
        javaScriptEnabled
        scrollEnabled={false}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        style={s.webview}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#edf1f7' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
