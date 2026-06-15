import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface TickerIconProps {
  value?: string;
  fallback: string;
  scale: number;
}

// --- Local Icon Mapping ---
const LOCAL_ICONS: Record<string, any> = {
  'USD': require('./assets/USD.jpg'),
  'EUR': require('./assets/EUR.jpg'),
  'GBP': require('./assets/GBP.jpg'),
  'CAD': require('./assets/CAD.jpg'),
  'CHF': require('./assets/CHF.jpg'),
  'SAR': require('./assets/SAR.jpg'),
  'KWD': require('./assets/KWD.jpg'),
  'AED': require('./assets/AED.jpg'),
  'QAR': require('./assets/QAR.jpg'),
  'BHD': require('./assets/BHD.jpg'),
  'JPY': require('./assets/JPY.jpg'),
  'DKK': require('./assets/DKK.jpg'),
  'NOK': require('./assets/NOK.jpg'),
  'SEK': require('./assets/SEK.jpg'),
};

export default function TickerIcon({
  value,
  fallback,
  scale,
}: TickerIconProps) {
  const size = 48 * scale;
  
  // 1. Check if we have a local icon for this currency code
  const upperCode = fallback.toUpperCase();
  if (LOCAL_ICONS[upperCode]) {
    return (
      <Image
        source={LOCAL_ICONS[upperCode]}
        style={{
          width: size,
          height: size,
          resizeMode: "contain",
          marginBottom: 2,
          borderRadius: 5,
        }}
      />
    );
  }

  // 2. Original logic: check if value is a valid URL or data URI
  const sourceIsImage = Boolean(
    value && typeof value === "string" && /(https?:|data:)/i.test(value),
  );
  if (sourceIsImage && value) {
    return (
      <Image
        source={{ uri: value }}
        style={{
          width: size,
          height: size,
          resizeMode: "stretch",
          marginBottom: 2,
          borderRadius: 5,
        }}
        resizeMode="stretch"
      />
    );
  }

  // 3. Ultimate Fallback: logo-fallback.png
  return (
    <Image
      source={require('./assets/logo-fallback.png')}
      style={{
        width: size,
        height: size,
        resizeMode: "contain",
        marginBottom: 2,
        borderRadius: 5,
        opacity: 0.3, // subtil
      }}
    />
  );
}

const styles = StyleSheet.create({
  tickerIconFallback: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tickerIconText: {
    color: "#f1f5f9",
    fontWeight: "600",
  },
});
