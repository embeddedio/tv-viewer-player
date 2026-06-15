import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, Animated, Easing,
  StyleSheet, ActivityIndicator, LayoutChangeEvent,
} from 'react-native';
import { COLORS as C } from '../../shared/colors';
import type { ExchangeRate } from '../../shared/types';
import { fetchTableauChangeRates } from '../TableauChange/scrapers';

interface Props {
  baseUrl: string;
  variant?: string;
  fontScale?: number;   // repurposé : vitesse = 100 × fontScale (clampé [50, 300])
  logoSize?: number;
  headerWeight?: number;
}

const REFRESH_MS = 30 * 60 * 1000;

export default function TickerDevises({ baseUrl, fontScale = 1.0 }: Props) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneHeight, setZoneHeight] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const animValue = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const speed = Math.min(300, Math.max(50, Math.round(100 * (fontScale ?? 1.0))));

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    fetchTableauChangeRates()
      .then(data => {
        if (data.length > 0) {
          setRates(data);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // ── Layout ────────────────────────────────────────────────────────────────
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setZoneHeight(e.nativeEvent.layout.height);
  }, []);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  // ── Animation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loopRef.current?.stop();
    animValue.setValue(0);

    if (!contentWidth || !rates.length) return;

    const baseDuration = Math.max(15000, contentWidth * 22);
    const duration = baseDuration / Math.max(0.1, speed / 100);

    const loop = Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loopRef.current = loop;
    loop.start();
    return () => { loop.stop(); };
  }, [animValue, contentWidth, rates, speed]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(0, contentWidth / 2)],
  });

  // ── Sizing (tout relatif à zoneHeight) ───────────────────────────────────
  const H = zoneHeight;
  const iconH     = H * 0.55;
  const iconW     = iconH * 1.35;
  const codeFs    = H * 0.28;
  const labelFs   = H * 0.16;
  const priceFs   = H * 0.26;
  const captionFs = H * 0.14;
  const padH      = H * 0.10;
  const itemGapW  = H * 0.45;
  const sepH      = H * 0.60;

  const duplicated = rates.length ? [...rates, ...rates] : [];

  return (
    <View style={s.root} onLayout={onContainerLayout}>
      {loading && !rates.length ? (
        <ActivityIndicator color={C.title} size="small" style={s.loader} />
      ) : (
        <Animated.View style={{ transform: [{ translateX }] }}>
          <View style={s.track} onLayout={onContentLayout}>
            {duplicated.map((rate, idx) => (
              <React.Fragment key={`${rate.code}-${idx}`}>
                <TickerItem
                  rate={rate}
                  baseUrl={baseUrl}
                  iconW={iconW}
                  iconH={iconH}
                  codeFs={codeFs}
                  labelFs={labelFs}
                  priceFs={priceFs}
                  captionFs={captionFs}
                  padH={padH}
                  zoneH={H}
                />
                <View style={[s.sep, { height: sepH, marginRight: itemGapW }]} />
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── TickerItem ────────────────────────────────────────────────────────────────

interface TickerItemProps {
  rate: ExchangeRate;
  baseUrl: string;
  iconW: number;
  iconH: number;
  codeFs: number;
  labelFs: number;
  priceFs: number;
  captionFs: number;
  padH: number;
  zoneH: number;
}

function TickerItem({
  rate, baseUrl,
  iconW, iconH, codeFs, labelFs, priceFs, captionFs, padH, zoneH,
}: TickerItemProps) {
  const [imgError, setImgError] = useState(false);
  const code = rate.code.split('-')[0].toUpperCase();
  const uri = `${baseUrl}/widgets/tableau-change/assets/${code}.jpg`;

  return (
    <View style={[s.item, { paddingHorizontal: padH }]}>
      {/* Drapeau */}
      {!imgError ? (
        <Image
          source={{ uri }}
          style={[s.flag, { width: iconW, height: iconH }]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[s.flagFallback, { width: iconW, height: iconH }]}>
          <Text style={[s.flagFallbackText, { fontSize: codeFs * 0.55 }]} numberOfLines={1}>
            {code}
          </Text>
        </View>
      )}

      {/* Code + Libellé */}
      <View style={[s.codeBlock, { marginLeft: zoneH * 0.06 }]}>
        <Text style={[s.codeText, { fontSize: codeFs }]} numberOfLines={1}>
          {code}
        </Text>
        <Text style={[s.labelText, { fontSize: labelFs }]} numberOfLines={1}>
          {formatShortLabel(rate.label)}
        </Text>
      </View>

      {/* Prix */}
      <View style={[s.priceBlock, { marginLeft: zoneH * 0.08 }]}>
        <View style={s.priceRow}>
          <Text style={[s.captionText, { fontSize: captionFs }]}>ACHAT </Text>
          <Text style={[s.buyText, { fontSize: priceFs }]}>{rate.buy || '-'}</Text>
        </View>
        <View style={s.priceRow}>
          <Text style={[s.captionText, { fontSize: captionFs }]}>VENTE </Text>
          <Text style={[s.sellText, { fontSize: priceFs }]}>{rate.sell || '-'}</Text>
        </View>
      </View>
    </View>
  );
}

/** "Suisse : Franc Suisse - CHF" → "Franc Suisse" */
function formatShortLabel(label: string): string {
  const sep = label.indexOf(' : ');
  const base = sep === -1 ? label : label.slice(sep + 3);
  const dashIdx = base.lastIndexOf(' - ');
  return dashIdx === -1 ? base : base.slice(0, dashIdx);
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.headerBg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  loader: {
    flex: 1,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    borderRadius: 3,
  },
  flagFallback: {
    backgroundColor: C.subHeaderBg,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagFallbackText: {
    color: C.title,
    fontWeight: '700',
  },
  codeBlock: {
    justifyContent: 'center',
  },
  codeText: {
    color: C.title,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  labelText: {
    color: C.muted,
    fontWeight: '500',
    marginTop: 1,
  },
  priceBlock: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  captionText: {
    color: C.muted,
    fontWeight: '600',
  },
  buyText: {
    color: C.buy,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sellText: {
    color: C.sell,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sep: {
    width: 1,
    backgroundColor: C.border,
    opacity: 0.4,
    alignSelf: 'center',
  },
});
