import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|bmp)$/i;

type AnimationType = 'left' | 'right' | 'up' | 'down' | 'fade';

interface FileEntry {
  name: string;
  folder: string | null;
}

interface Props {
  baseUrl: string;
  sources?: 'all' | string[];
  slideDuration?: number;
  animation?: AnimationType;
}

export default function ImageSlider({ baseUrl, sources = 'all', slideDuration = 6, animation = 'left' }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const slideAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filterImages = useCallback((files: FileEntry[]) => {
    const filtered = files.filter(f => IMAGE_EXTS.test(f.name));
    if (sources === 'all') return filtered.map(f => f.name);
    const folders = Array.isArray(sources) ? sources : [];
    return filtered.filter(f => folders.includes(f.folder ?? '')).map(f => f.name);
  }, [sources]);

  const startTimer = useCallback((imgs: string[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (imgs.length <= 1) return;
    timerRef.current = setInterval(() => {
      setAnimating(true);
    }, slideDuration * 1000);
  }, [slideDuration]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const filesRes = await fetch(`${baseUrl}/files`).then(r => r.json()).catch(() => ({ files: [] }));
      if (cancelled) return;

      const imgs = filterImages(filesRes.files || []);

      if (!imgs.length) {
        retryRef.current = setInterval(async () => {
          const r = await fetch(`${baseUrl}/files`).then(x => x.json()).catch(() => ({ files: [] }));
          const retryImgs = filterImages(r.files || []);
          if (retryImgs.length && retryRef.current) {
            clearInterval(retryRef.current);
            retryRef.current = null;
            setImages(retryImgs);
            setCurrentIdx(0);
            setNextIdx(1 % retryImgs.length);
            startTimer(retryImgs);
          }
        }, 3000);
        return;
      }

      setImages(imgs);
      setCurrentIdx(0);
      setNextIdx(1 % imgs.length);
      startTimer(imgs);
    };

    load();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [baseUrl, filterImages, startTimer]);

  useEffect(() => {
    if (!animating || images.length <= 1) return;

    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIdx(prev => (prev + 1) % images.length);
      setNextIdx(prev => (prev + 1) % images.length);
      slideAnim.setValue(0);
      setAnimating(false);
    });
  }, [animating, images.length, slideAnim]);

  const buildTransform = (isCurrent: boolean) => {
    if (animation === 'fade') return [];

    const axis = animation === 'left' || animation === 'right' ? 'translateX' : 'translateY';
    const dist = animation === 'left' || animation === 'right' ? size.width : size.height;
    const sign = animation === 'left' || animation === 'up' ? 1 : -1;

    const from = isCurrent ? 0 : sign * dist;
    const to   = isCurrent ? -sign * dist : 0;

    return [{ [axis]: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }];
  };

  const buildOpacity = (isCurrent: boolean) => {
    if (animation !== 'fade') return 1;
    return slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: isCurrent ? [1, 0] : [0, 1],
    });
  };

  if (!images.length) return <View style={s.root} />;

  const currentUri = `${baseUrl}/uploads/${encodeURIComponent(images[currentIdx])}`;
  const nextUri    = `${baseUrl}/uploads/${encodeURIComponent(images[nextIdx])}`;

  return (
    <View
      style={s.root}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: buildTransform(true) as any, opacity: buildOpacity(true) as any },
        ]}
      >
        <Image source={{ uri: currentUri }} style={s.img} resizeMode="stretch" />
      </Animated.View>

      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: buildTransform(false) as any, opacity: buildOpacity(false) as any },
        ]}
      >
        <Image source={{ uri: nextUri }} style={s.img} resizeMode="stretch" />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  img:  { width: '100%', height: '100%' },
});
