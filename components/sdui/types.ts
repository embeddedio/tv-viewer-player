// SDUI type definitions

export interface UIDefinition {
  version: number;
  widget: string;
  dataSource?: DataSourceDef;
  additionalSources?: Record<string, DataSourceDef>;
  computed?: Record<string, { expr: string }>;
  root: UINode;
}

export interface DataSourceDef {
  url: string;
  refreshMs?: number;
  transform?: string;
}

export interface UINode {
  type: 'view' | 'text' | 'image' | 'animated-view' | 'video' | 'scroll-view' | 'flat-list' | 'spacer';
  style?: Record<string, any>;
  props?: Record<string, any>;
  children?: UINode[] | string;
  conditional?: ConditionalDef;
}

export interface ConditionalDef {
  if: string;
  then?: Partial<Pick<UINode, 'style' | 'props' | 'children'>>;
  else?: Partial<Pick<UINode, 'style' | 'props' | 'children'>>;
}

export type AnimationType = 'timing' | 'loop' | 'sequence';
export type AnimatableProperty = 'opacity' | 'translateX' | 'translateY' | 'scale' | 'rotate';
export type EasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface AnimationStep {
  property: AnimatableProperty;
  from: number | string;
  to: number | string;
  duration: number | string;
  easing?: EasingName;
  delay?: number;
}

export interface AnimationDef {
  type: AnimationType;
  property?: AnimatableProperty;
  from?: number | string;
  to?: number | string;
  duration?: number | string;
  easing?: EasingName;
  delay?: number;
  steps?: AnimationStep[];
}

export interface BindingContext {
  $data: any;
  $item?: any;
  $index?: number;
  $sources: Record<string, any>;
  $env: {
    baseUrl: string;
    date: string;
    time: string;
    locale: string;
  };
  $props: Record<string, any>;
  $layout: { width: number; height: number; contentWidth?: number };
  $computed: Record<string, any>;
}
