import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

interface VideoViewWrapperProps {
  uri: string;
  onError: () => void;
  onEnd?: () => void;
  rotation?: string;
  muted?: boolean;
  loop?: boolean;
}

export default function VideoViewWrapper({
  uri,
  onError,
  onEnd,
  muted = true,
  loop = false,
}: VideoViewWrapperProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.play();
  });

  useEffect(() => {
    if (!onEnd) return;
    const sub = player.addListener("playToEnd", () => {
      onEnd();
    });
    return () => sub.remove();
  }, [player, onEnd]);

  return (
    <VideoView
      style={styles.fullscreenMedia}
      player={player}
      nativeControls={false}
      allowsPictureInPicture={false}
      contentFit="fill"
      surfaceType="textureView"
    />
  );
}

const styles = StyleSheet.create({
  fullscreenMedia: {
    width: "100%",
    height: "100%",
  },
});
