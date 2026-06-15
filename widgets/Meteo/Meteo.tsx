import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  baseUrl: string;
  city?: string;
  theme?: string;
}

export default function Meteo({ baseUrl, city = 'Tanger', theme = 'stratum-dark' }: Props) {
  const uri =
    baseUrl + '/widgets/meteo/index.html' +
    '?city='  + encodeURIComponent(city) +
    '&theme=' + encodeURIComponent(theme);

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
  root:    { flex: 1, backgroundColor: '#0d0d1a' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
