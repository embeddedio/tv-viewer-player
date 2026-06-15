import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import TickerIcon from "./TickerIcon";

type TickerItem = {
  code: string;
  label: string;
  icon?: string;
  buy?: number | string;
  sell?: number | string;
  buyLabel?: string;
  sellLabel?: string;
};

const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  {
    code: "USD",
    label: "Dollar US",
    icon: "$",
    buyLabel: "Achat",
    buy: "-",
    sellLabel: "Vente",
    sell: "-",
  },
  {
    code: "EUR",
    label: "Euro",
    icon: "€",
    buyLabel: "Achat",
    buy: "-",
    sellLabel: "Vente",
    sell: "-",
  },
  {
    code: "GBP",
    label: "Livre",
    icon: "£",
    buyLabel: "Achat",
    buy: "-",
    sellLabel: "Vente",
    sell: "-",
  },
];

interface TickerMarqueeProps {
  items: TickerItem[];
  scale: number;
  itemGap: number;
  speed: number;
}

export default function TickerMarquee({
  items,
  scale,
  itemGap,
  speed,
}: TickerMarqueeProps) {
  const duplicated = items.length ? [...items, ...items] : DEFAULT_TICKER_ITEMS;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (!contentWidth || !items.length) {
      animatedValue.stopAnimation();
      animatedValue.setValue(0);
      return;
    }
    animatedValue.stopAnimation();
    animatedValue.setValue(0);

    // speed is a percentage (100 = normal speed)
    const baseDuration = Math.max(8000, contentWidth * 25);
    const speedFactor = Math.max(0.1, speed / 100);
    const duration = baseDuration / speedFactor;

    const loop = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animatedValue, contentWidth, items, speed]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(0, contentWidth / 2)],
  });

  return (
    <View style={styles.tickerClip}>
      <Animated.View
        style={[styles.tickerTrack, { transform: [{ translateX }] }]}
      >
        <View
          style={styles.tickerContent}
          onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
        >
          {duplicated.map((item, index) => (
            <View
              key={`${item.code}-${index}`}
              style={[
                styles.tickerItem,
                { transform: [{ scale }], marginRight: itemGap },
              ]}
            >
              <View style={styles.tickerLeft}>
                <TickerIcon
                  value={item.icon}
                  fallback={item.code}
                  scale={scale}
                />
                <Text style={[styles.tickerCode, { fontSize: 16 * scale }]}>
                  {item.code}
                </Text>
              </View>
              <View style={styles.tickerRight}>
                <View style={styles.priceLine}>
                  <Text style={[styles.priceLabel, { fontSize: 12 * scale }]}>
                    {item.buyLabel || "Achat"} :
                  </Text>
                  <Text
                    style={[
                      styles.priceValue,
                      styles.buyPrice,
                      { fontSize: 36 * scale },
                    ]}
                  >
                    {item.buy ?? "-"}
                  </Text>
                </View>
                <View style={styles.priceLine}>
                  <Text style={[styles.priceLabel, { fontSize: 12 * scale }]}>
                    {item.sellLabel || "Vente"} :
                  </Text>
                  <Text
                    style={[
                      styles.priceValue,
                      styles.sellPrice,
                      { fontSize: 36 * scale },
                    ]}
                  >
                    {item.sell ?? "-"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tickerClip: {
    overflow: "hidden",
    width: "100%",
    flex: 1,
    paddingBottom: 10,
  },
  tickerTrack: {
    flexDirection: "row",
  },
  tickerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  tickerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 28,
    paddingVertical: 10,
    paddingHorizontal: 2,
    backgroundColor: "transparent",
    borderRadius: 14,
    minWidth: 200,
  },
  tickerLeft: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    height: "100%",
  },
  tickerCode: {
    fontWeight: "bold",
    color: "#f8fafc",
    marginTop: 6,
  },
  tickerRight: {
    flex: 1,
    justifyContent: "center",
  },
  priceLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
    gap: 8,
  },
  priceLabel: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  priceValue: {
    fontWeight: "800",
  },
  buyPrice: {
    color: "#4ade80",
  },
  sellPrice: {
    color: "#f87171",
  },
});
