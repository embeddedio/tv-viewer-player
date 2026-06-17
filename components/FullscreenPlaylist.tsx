import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { VideoView } from "expo-video";
import VideoViewWrapper from "./VideoViewWrapper";

// Durée d'affichage sûre en ms : au moins 1s, jamais 0/NaN/négative.
// Sans ce garde-fou, une métadonnée endommagée (duration <= 0) déclenche un
// setTimeout(0) en boucle → CPU 100% → l'app (et la box) se figent.
function safeDurationMs(d: unknown, fallbackSec = 10): number {
  const n = Number(d);
  const sec = Number.isFinite(n) && n > 0 ? n : fallbackSec;
  return Math.max(1, sec) * 1000;
}

interface FullscreenPlaylistProps {
  items: {
    name: string;
    originalName?: string;
    category: string;
    duration: number;
    muted?: boolean;
  }[];
  baseUrl: string;
  index: number;
  setIndex: (i: number) => void;
  videoRef: React.MutableRefObject<VideoView | null>;
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  rotation?: string; // Nouvelle prop pour l'orientation
}

export default function FullscreenPlaylist({
  items,
  baseUrl,
  index,
  setIndex,
  videoRef,
  timerRef,
  rotation = "landscape-left", // Valeur par défaut
}: FullscreenPlaylistProps) {
  // Garde-fou playlist vide : items[index % 0] = items[NaN] = undefined → crash.
  // On utilise un placeholder neutre (sans return anticipé, pour ne pas casser
  // l'ordre des hooks ci-dessous).
  const hasItems = Array.isArray(items) && items.length > 0;
  const current = hasItems
    ? items[index % items.length]
    : { name: "", originalName: "", category: "media", duration: 10 };
  const uri = `${baseUrl}/uploads/${encodeURIComponent(current.name)}`;
  const displayName = current.originalName || current.name;
  const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(current.name);
  const isVideo = /\.(mp4|m4v|mov|avi|mkv|webm)$/i.test(current.name);
  const isAudio = /\.(mp3|aac|wav|flac|ogg)$/i.test(current.name);
  const fade = useRef(new Animated.Value(1)).current;

  // Fonction pour obtenir le style de rotation pour les médias
  // IMPORTANT: Les médias ne doivent PAS être rotés car le conteneur parent (App.tsx) gère déjà la rotation
  // Si on appliquait une rotation ici, on aurait une double rotation
  const getMediaRotationStyle = useCallback(() => {
    // Pas de rotation sur les médias car le conteneur parent est déjà roté
    return {
      transform: [{ rotate: "0deg" }],
    };
  }, [rotation]);

  const advance = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current as any);
      timerRef.current = null;
    }
    Animated.timing(fade, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const next = (index + 1) % items.length;
      setIndex(next);
      fade.setValue(0);
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [fade, index, items.length, setIndex, timerRef]);

  // Timer pour images/audio — les videos avancent via onEnd
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current as any);
      timerRef.current = null;
    }
    if (isVideo) return; // pas de timer pour les videos
    if (!hasItems) return; // rien à faire tant que la playlist est vide
    timerRef.current = setTimeout(() => {
      advance();
    }, safeDurationMs(current.duration));
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current as any);
        timerRef.current = null;
      }
    };
  }, [index, current.duration, current.name, isVideo, advance, timerRef]);

  const onVideoError = () => {
    advance();
  };

  const mediaRotationStyle = getMediaRotationStyle();

  return (
    <View style={styles.fullscreenContainer}>
      {isImage && (
        <Animated.Image
          source={{ uri }}
          style={[
            styles.fullscreenMedia,
            { opacity: fade },
            mediaRotationStyle,
          ]}
          resizeMode="stretch"
          onError={advance}
        />
      )}
      {isVideo && (
        <Animated.View
          style={[
            styles.fullscreenMedia,
            styles.videoContainer,
            { opacity: fade },
          ]}
        >
          <VideoViewWrapper
            uri={uri}
            onError={onVideoError}
            onEnd={advance}
            rotation={rotation}
            muted={current.muted !== false}
            loop={items.length === 1}
          />
        </Animated.View>
      )}
      {isAudio && (
        <Animated.View style={[styles.audioPlaceholder, { opacity: fade }]}>
          <Text style={styles.audioText}>{displayName}</Text>
        </Animated.View>
      )}
      {!isImage && !isVideo && !isAudio && (
        <View style={styles.audioPlaceholder}>
          <Text style={styles.audioText}>
            Fichier non pris en charge: {displayName}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  fullscreenMedia: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    overflow: "hidden",
  },
  audioPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  audioText: {
    color: "#fff",
    fontSize: 20,
  },
});
