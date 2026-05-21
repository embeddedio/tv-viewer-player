import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { UINode, BindingContext, AnimationDef, EasingName } from './types';
import { resolveStyle, resolveProps, resolveValue, evaluateCondition } from './resolveBindings';
import VideoViewWrapper from '../VideoViewWrapper';

// --- Easing map ---

const EASING_MAP: Record<EasingName, (v: number) => number> = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.cubic),
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
};

// --- Animated View component (needs hooks) ---

function AnimatedViewNode({ node, ctx }: { node: UINode; ctx: BindingContext }) {
  const resolvedStyle = resolveStyle(node.style, ctx) || {};
  const resolvedProps = resolveProps(node.props, ctx) || {};
  const animDef = resolvedProps.animation as AnimationDef | undefined;

  const animValue = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!animDef) return;

    const from = typeof animDef.from === 'string' ? resolveValue(animDef.from, ctx) : animDef.from;
    const to = typeof animDef.to === 'string' ? resolveValue(animDef.to, ctx) : animDef.to;
    const duration = typeof animDef.duration === 'string' ? resolveValue(animDef.duration, ctx) : animDef.duration;
    const easing = EASING_MAP[animDef.easing || 'linear'];
    const delay = animDef.delay || 0;

    const numFrom = Number(from) || 0;
    const numTo = Number(to) || 0;
    const numDuration = Math.max(100, Number(duration) || 5000);

    // Stop previous animation
    if (animRef.current) animRef.current.stop();

    if (animDef.type === 'timing') {
      animValue.setValue(numFrom);
      const timing = Animated.timing(animValue, {
        toValue: numTo,
        duration: numDuration,
        easing,
        delay,
        useNativeDriver: true,
      });
      animRef.current = timing;
      timing.start();
    } else if (animDef.type === 'loop') {
      animValue.setValue(numFrom);
      const timing = Animated.timing(animValue, {
        toValue: numTo,
        duration: numDuration,
        easing,
        delay,
        useNativeDriver: true,
      });
      const loop = Animated.loop(timing);
      animRef.current = loop;
      loop.start();
    } else if (animDef.type === 'sequence' && animDef.steps) {
      const steps = animDef.steps.map(step => {
        const sFrom = typeof step.from === 'string' ? resolveValue(step.from, ctx) : step.from;
        const sTo = typeof step.to === 'string' ? resolveValue(step.to, ctx) : step.to;
        const sDur = typeof step.duration === 'string' ? resolveValue(step.duration, ctx) : step.duration;
        return Animated.timing(animValue, {
          toValue: Number(sTo) || 0,
          duration: Math.max(0, Number(sDur) || 1000),
          easing: EASING_MAP[step.easing || 'linear'],
          delay: step.delay || 0,
          useNativeDriver: true,
        });
      });
      if (steps.length > 0 && animDef.steps[0]) {
        const firstFrom = typeof animDef.steps[0].from === 'string'
          ? resolveValue(animDef.steps[0].from, ctx)
          : animDef.steps[0].from;
        animValue.setValue(Number(firstFrom) || 0);
      }
      const seq = Animated.loop(Animated.sequence(steps));
      animRef.current = seq;
      seq.start();
    }

    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [animDef?.type, animDef?.property, ctx.$layout?.width, ctx.$computed]);

  // Build animated style based on property
  let animatedStyle: any = {};
  if (animDef?.property) {
    if (animDef.property === 'opacity') {
      animatedStyle = { opacity: animValue };
    } else if (animDef.property === 'translateX') {
      animatedStyle = { transform: [{ translateX: animValue }] };
    } else if (animDef.property === 'translateY') {
      animatedStyle = { transform: [{ translateY: animValue }] };
    } else if (animDef.property === 'scale') {
      animatedStyle = { transform: [{ scale: animValue }] };
    } else if (animDef.property === 'rotate') {
      const from = typeof animDef.from === 'string' ? resolveValue(animDef.from, ctx) : animDef.from;
      const to = typeof animDef.to === 'string' ? resolveValue(animDef.to, ctx) : animDef.to;
      animatedStyle = {
        transform: [{
          rotate: animValue.interpolate({
            inputRange: [Number(from) || 0, Number(to) || 360],
            outputRange: [String(from || '0deg'), String(to || '360deg')],
          }),
        }],
      };
    }
  }

  return (
    <Animated.View style={[resolvedStyle, animatedStyle]}>
      {renderChildren(node.children, ctx)}
    </Animated.View>
  );
}

// --- Render helpers ---

function renderChildren(children: UINode[] | string | undefined, ctx: BindingContext): React.ReactNode {
  if (children == null) return null;
  if (typeof children === 'string') {
    const resolved = resolveValue(children, ctx);
    return resolved != null ? String(resolved) : '';
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => renderNode(child, ctx, i));
  }
  return null;
}

function applyConditional(node: UINode, ctx: BindingContext): UINode | null {
  if (!node.conditional) return node;

  const condResult = evaluateCondition(node.conditional.if, ctx);
  const patch = condResult ? node.conditional.then : node.conditional.else;

  if (!patch) return node;

  // Check for display: none
  if (patch.style?.display === 'none') return null;

  // Merge patches
  const merged: UINode = {
    ...node,
    style: patch.style ? { ...(node.style || {}), ...patch.style } : node.style,
    props: patch.props ? { ...(node.props || {}), ...patch.props } : node.props,
    conditional: undefined,
  };

  if (patch.children !== undefined) {
    merged.children = patch.children;
  }

  return merged;
}

// --- Main render function ---

export function renderNode(node: UINode, ctx: BindingContext, key?: string | number): React.ReactElement | null {
  // Apply conditional
  const processed = applyConditional(node, ctx);
  if (!processed) return null;

  const resolvedStyle = resolveStyle(processed.style, ctx);
  const resolvedProps = resolveProps(processed.props, ctx) || {};

  // Check for display: none in resolved style
  if (resolvedStyle?.display === 'none') return null;

  const k = key != null ? String(key) : undefined;

  switch (processed.type) {
    case 'view':
      return (
        <View key={k} style={resolvedStyle}>
          {renderChildren(processed.children, ctx)}
        </View>
      );

    case 'text': {
      const content = typeof processed.children === 'string'
        ? resolveValue(processed.children, ctx)
        : processed.children;
      const textContent = content != null ? String(content) : '';
      return (
        <Text
          key={k}
          style={resolvedStyle}
          numberOfLines={resolvedProps.numberOfLines}
          ellipsizeMode={resolvedProps.ellipsizeMode}
        >
          {textContent}
        </Text>
      );
    }

    case 'image': {
      const source = resolvedProps.source;
      if (!source?.uri) return null;
      return (
        <Image
          key={k}
          style={resolvedStyle}
          source={{ uri: source.uri }}
          resizeMode={resolvedProps.resizeMode || 'cover'}
          defaultSource={undefined}
        />
      );
    }

    case 'animated-view':
      return <AnimatedViewNode key={k} node={processed} ctx={ctx} />;

    case 'video': {
      const uri = resolvedProps.uri;
      if (!uri) return null;
      return (
        <View key={k} style={resolvedStyle || styles.flex1}>
          <VideoViewWrapper
            uri={uri}
            loop={resolvedProps.loop ?? false}
            muted={resolvedProps.muted ?? true}
            onError={() => {}}
            onEnd={resolvedProps.onEnd}
          />
        </View>
      );
    }

    case 'scroll-view':
      return (
        <ScrollView
          key={k}
          style={resolvedStyle}
          horizontal={resolvedProps.horizontal || false}
          showsVerticalScrollIndicator={resolvedProps.showsScrollIndicator || false}
          showsHorizontalScrollIndicator={resolvedProps.showsScrollIndicator || false}
        >
          {renderChildren(processed.children, ctx)}
        </ScrollView>
      );

    case 'flat-list': {
      // Use RAW props — template/keyExtractor/separator contain $item/$index
      // bindings that must NOT be pre-resolved before iteration
      const rawProps = processed.props || {};
      const dataValue = resolveValue(rawProps.data, ctx);
      const items = Array.isArray(dataValue) ? dataValue : [];
      const template = rawProps.template as UINode | undefined;
      const separator = rawProps.separator as UINode | undefined;

      if (!template) return null;

      return (
        <React.Fragment key={k}>
          {items.map((item: any, index: number) => {
            const itemCtx: BindingContext = { ...ctx, $item: item, $index: index };
            const keyVal = rawProps.keyExtractor
              ? String(resolveValue(rawProps.keyExtractor, itemCtx) ?? index)
              : String(index);
            return (
              <React.Fragment key={keyVal}>
                {index > 0 && separator ? renderNode(separator, itemCtx, `sep-${index}`) : null}
                {renderNode(template, itemCtx, keyVal)}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    }

    case 'spacer': {
      const size = Number(resolvedProps.size) || 0;
      return <View key={k} style={{ width: size, height: size }} />;
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
