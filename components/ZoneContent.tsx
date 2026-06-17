import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, StyleSheet, Image } from "react-native";
import FullscreenPlaylist from "./FullscreenPlaylist";
import NativeWidgetRenderer from "./sdui/NativeWidgetRenderer";
import WidgetWebView from "./WidgetWebView";
import type { ZoneConfig, ZoneItem, ZoneMediaItem, ZoneWidgetItem } from "../layouts";


function isMediaItem(item: ZoneItem): item is ZoneMediaItem {
  return "mediaName" in item;
}

function isWidgetItem(item: ZoneItem): item is ZoneWidgetItem {
  return "widgetType" in item;
}

interface ZoneContentProps {
  zoneConfig: ZoneConfig;
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

function ZoneContent({
  zoneConfig,
  logoInfo,
  baseUrl,
  rotation = "landscape-left",
}: ZoneContentProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef(null);
  const cycleFade = useRef(new Animated.Value(1)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current as any);
        timerRef.current = null;
      }
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current as any);
        cycleTimerRef.current = null;
      }
    };
  }, []);

  const items = zoneConfig.items;
  const hasItems = items && items.length > 0;

  const currentCycleItem = hasItems && items ? items[cycleIndex % items.length] : null;
  const currentIsVideo = currentCycleItem && isMediaItem(currentCycleItem)
    && /\.(mp4|m4v|mov|avi|mkv|webm)$/i.test(currentCycleItem.mediaName);

  const itemCount = items ? items.length : 0;
  useEffect(() => {
    if (itemCount <= 1) {
      cycleFade.setValue(1);
      return;
    }
    cycleFade.setValue(0);
    Animated.timing(cycleFade, {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cycleIndex, cycleFade, itemCount]);

  useEffect(() => {
    if (!hasItems || !items || items.length <= 1) return;
    if (currentIsVideo) return;

    const currentItem = items[cycleIndex % items.length];
    // Clamp >= 1s : une durée 0/négative/NaN (métadonnée endommagée) ferait un
    // setTimeout(0) → cycle infini → CPU 100% → app/box figées.
    const rawSec = Number(currentItem?.duration);
    const safeSec = Number.isFinite(rawSec) && rawSec > 0 ? rawSec : 10;
    const duration = Math.max(1, safeSec) * 1000;

    cycleTimerRef.current = setTimeout(() => {
      Animated.timing(cycleFade, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setCycleIndex((prev) => (prev + 1) % items.length);
      });
    }, duration);

    return () => {
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current as any);
        cycleTimerRef.current = null;
      }
    };
  }, [cycleIndex, hasItems, items, currentIsVideo, cycleFade]);

  switch (zoneConfig.type) {
    case "playlist": {
      if (hasItems && items) {
        const currentItem = items[cycleIndex % items.length];

        if (isWidgetItem(currentItem)) {
          return (
            <Animated.View style={[styles.fadeWrap, { opacity: cycleFade }]}>
              <NativeWidgetRenderer
                baseUrl={baseUrl}
                widgetType={currentItem.widgetType}
                widgetItem={currentItem as ZoneWidgetItem}
                fallback={
                  <WidgetWebView
                    baseUrl={baseUrl}
                    widgetType={currentItem.widgetType}
                    widgetItem={currentItem as ZoneWidgetItem}
                  />
                }
              />
            </Animated.View>
          );
        }

        if (isMediaItem(currentItem)) {
          const mediaPlaylist = items
            .filter(isMediaItem)
            .map((m) => ({
              name: m.mediaName,
              originalName: m.originalName || m.mediaName,
              category: "media",
              duration: m.duration || 10,
              muted: m.muted !== false,
            }));

          if (items.every(isMediaItem)) {
            if (cycleTimerRef.current) {
              clearTimeout(cycleTimerRef.current as any);
              cycleTimerRef.current = null;
            }
            return (
              <FullscreenPlaylist
                items={mediaPlaylist}
                baseUrl={baseUrl}
                index={currentIndex}
                setIndex={setCurrentIndex}
                videoRef={videoRef}
                timerRef={timerRef}
                rotation={rotation}
              />
            );
          }

          const singleItem = [{
            name: currentItem.mediaName,
            originalName: currentItem.originalName || currentItem.mediaName,
            category: "media",
            duration: currentItem.duration || 10,
            muted: currentItem.muted !== false,
          }];

          return (
            <Animated.View style={[styles.fadeWrap, { opacity: cycleFade }]}>
              <FullscreenPlaylist
                items={singleItem}
                baseUrl={baseUrl}
                index={0}
                setIndex={() => {
                  Animated.timing(cycleFade, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                  }).start(() => {
                    if (items && items.length > 1) {
                      setCycleIndex((prev) => (prev + 1) % items.length);
                    }
                  });
                }}
                videoRef={videoRef}
                timerRef={timerRef}
                rotation={rotation}
              />
            </Animated.View>
          );
        }

        return <View style={styles.emptyZone} />;
      }

      return (
        <View style={styles.emptyZone}>
          {logoInfo?.url ? (
            <Image
              source={{ uri: logoInfo.url }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      );
    }

    case "logo":
      if (!logoInfo?.url) {
        return <View style={styles.emptyZone} />;
      }
      return (
        <View style={styles.logoZone}>
          <Image
            source={{ uri: logoInfo.url }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      );

    case "empty":
    default:
      return <View style={styles.emptyZone} />;
  }
}

export default React.memo(ZoneContent);

const styles = StyleSheet.create({
  fadeWrap: {
    flex: 1,
    backgroundColor: "#000",
  },
  emptyZone: {
    flex: 1,
    backgroundColor: "#000",
  },
  logoZone: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logoImage: {
    width: "90%",
    height: "90%",
  },
});
