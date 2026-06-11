import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import VideoViewWrapper from '../../components/VideoViewWrapper';

const VIDEO_EXTS = /\.(mp4|m4v|mov|avi|mkv|webm)$/i;

interface FileEntry {
  name: string;
  folder: string | null;
}

interface Props {
  baseUrl: string;
  sources?: 'all' | string[];
  videoMuted?: boolean;
}

export default function VideoSlider({ baseUrl, sources = 'all', videoMuted = false }: Props) {
  const [videos, setVideos] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filterVideos = useCallback((files: FileEntry[]) => {
    const filtered = files.filter(f => VIDEO_EXTS.test(f.name));
    if (sources === 'all') return filtered.map(f => f.name);
    const folders = Array.isArray(sources) ? sources : [];
    return filtered.filter(f => folders.includes(f.folder ?? '')).map(f => f.name);
  }, [sources]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const filesRes = await fetch(`${baseUrl}/files`).then(r => r.json()).catch(() => ({ files: [] }));
      if (cancelled) return;

      const vids = filterVideos(filesRes.files || []);

      if (!vids.length) {
        retryRef.current = setInterval(async () => {
          const r = await fetch(`${baseUrl}/files`).then(x => x.json()).catch(() => ({ files: [] }));
          const retryVids = filterVideos(r.files || []);
          if (retryVids.length && retryRef.current) {
            clearInterval(retryRef.current);
            retryRef.current = null;
            setVideos(retryVids);
            setCurrentIdx(0);
          }
        }, 3000);
        return;
      }

      setVideos(vids);
      setCurrentIdx(0);
    };

    load();
    return () => {
      cancelled = true;
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [baseUrl, filterVideos]);

  const handleEnd = useCallback(() => {
    setCurrentIdx(prev => (prev + 1) % videos.length);
  }, [videos.length]);

  if (!videos.length) return <View style={s.root} />;

  const uri = `${baseUrl}/uploads/${encodeURIComponent(videos[currentIdx])}`;

  return (
    <View style={s.root}>
      <VideoViewWrapper
        uri={uri}
        onEnd={handleEnd}
        onError={handleEnd}
        loop={videos.length <= 1}
        muted={videoMuted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
