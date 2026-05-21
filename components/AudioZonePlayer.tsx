import { useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import type { ZoneConfig, ZoneMediaItem } from "../layouts";

interface AudioZonePlayerProps {
  zoneConfig: ZoneConfig | undefined;
  baseUrl: string;
}

function isAudioFile(name: string): boolean {
  return /\.(mp3|aac|wav|flac|ogg|m4a|wma)$/i.test(name);
}

export default function AudioZonePlayer({ zoneConfig, baseUrl }: AudioZonePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const audioItems: ZoneMediaItem[] = (zoneConfig?.items || []).filter(
    (item): item is ZoneMediaItem =>
      "mediaName" in item && isAudioFile(item.mediaName)
  );

  const item = audioItems.length > 0 ? audioItems[currentIndex % audioItems.length] : null;
  const uri = item ? `${baseUrl}/uploads/${encodeURIComponent(item.mediaName)}` : null;

  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
  }, []);

  // Boucle automatique sur piste unique
  useEffect(() => {
    player.loop = audioItems.length <= 1;
  }, [player, audioItems.length]);

  // Démarrage à chaque changement de piste
  useEffect(() => {
    if (uri) {
      player.play();
    }
  }, [uri]);

  // Avance à la piste suivante quand la piste courante se termine (multi-piste)
  useEffect(() => {
    if (wasPlayingRef.current && !status.playing && status.currentTime > 0 && audioItems.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % audioItems.length);
    }
    wasPlayingRef.current = status.playing ?? false;
  }, [status.playing, audioItems.length]);

  return null;
}
