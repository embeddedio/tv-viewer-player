import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

interface MessageMarqueeProps {
  messages: string[];
  direction?: "ltr" | "rtl";
  fontSize?: number;
  speed?: number;
}

export default function MessageMarquee({
  messages,
  direction = "ltr",
  fontSize = 24,
  speed = 100,
}: MessageMarqueeProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (!contentWidth || messages.length === 0) {
      animatedValue.stopAnimation();
      animatedValue.setValue(0);
      return;
    }
    animatedValue.stopAnimation();
    animatedValue.setValue(0);

    const baseDuration = Math.max(10000, messages.length * 5000);
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
  }, [animatedValue, contentWidth, messages, direction, speed]);

  const halfWidth = Math.max(0, contentWidth / 2);
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange:
      direction === "rtl" ? [-halfWidth, 0] : [0, -halfWidth],
  });

  if (messages.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Aucun message configure</Text>
      </View>
    );
  }

  // Build content: msg1 ★ msg2 ★ ... then duplicate
  const buildSegment = () =>
    messages.flatMap((msg, i) => {
      const parts: React.ReactNode[] = [
        <Text key={`msg-${i}`} style={[styles.messageText, { fontSize }]}>
          {msg}
        </Text>,
      ];
      parts.push(
        <Text key={`sep-${i}`} style={[styles.separator, { fontSize }]}>
          {" \u2605 "}
        </Text>,
      );
      return parts;
    });

  const segment = buildSegment();
  const duplicated = [...segment, ...segment.map((node, i) =>
    React.cloneElement(node as React.ReactElement, { key: `dup-${i}` }),
  )];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.track, { transform: [{ translateX }] }]}
      >
        <View
          style={styles.content}
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
        >
          {duplicated}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    overflow: "hidden",
    justifyContent: "center",
  },
  track: {
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 24,
  },
  separator: {
    color: "#facc15",
    fontSize: 24,
    fontWeight: "700",
  },
  placeholder: {
    color: "#94a3b8",
    fontSize: 18,
    textAlign: "center",
    width: "100%",
  },
});
