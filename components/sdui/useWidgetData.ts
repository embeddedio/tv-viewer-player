import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { UIDefinition, BindingContext } from './types';
import { resolveValue } from './resolveBindings';

function applyTransform(response: any, transform: string | undefined): any {
  if (!transform || transform === '$response') return response;
  // Simple path resolution on $response
  const path = transform.replace(/^\$response\.?/, '');
  if (!path) return response;
  const segments = path.split('.');
  let current = response;
  for (const seg of segments) {
    if (current == null) return undefined;
    current = current[seg];
  }
  return current;
}

export function useWidgetData(
  baseUrl: string,
  widgetType: string,
  widgetItem: Record<string, any>,
) {
  const [uiDef, setUiDef] = useState<UIDefinition | null>(null);
  const [data, setData] = useState<any>(null);
  const [sources, setSources] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [computed, setComputed] = useState<Record<string, any>>({});

  const mountedRef = useRef(true);
  const dataRef = useRef<any>(null);
  const sourcesRef = useRef<Record<string, any>>({});

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch ui.json
  useEffect(() => {
    setLoading(true);
    setError(false);
    setUiDef(null);

    const url = `${baseUrl}/widgets/${widgetType}/ui.json`;

    fetch(url)
      .then(r => {
        if (r.status === 404) throw new Error('not-found');
        return r.json();
      })
      .then(def => {
        if (mountedRef.current) {
          setUiDef(def);
          setLoading(false);
        }
      })
      .catch((_err) => {
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
        }
      });
  }, [baseUrl, widgetType]);

  // Fetch primary data
  useEffect(() => {
    if (!uiDef?.dataSource?.url) return;

    const fetchData = () => {
      fetch(`${baseUrl}${uiDef.dataSource!.url}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(response => {
          if (!mountedRef.current) return;
          const transformed = applyTransform(response, uiDef.dataSource!.transform);
          dataRef.current = transformed;
          setData(transformed);
        })
        .catch(() => {});
    };

    fetchData();
    const interval = setInterval(fetchData, uiDef.dataSource.refreshMs || 30000);
    return () => clearInterval(interval);
  }, [baseUrl, uiDef]);

  // Fetch additional sources
  useEffect(() => {
    if (!uiDef?.additionalSources) return;

    const intervals: ReturnType<typeof setInterval>[] = [];

    for (const [key, srcDef] of Object.entries(uiDef.additionalSources)) {
      const fetchSource = () => {
        fetch(`${baseUrl}${srcDef.url}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(response => {
            if (!mountedRef.current) return;
            const transformed = applyTransform(response, srcDef.transform);
            sourcesRef.current = { ...sourcesRef.current, [key]: transformed };
            setSources(prev => ({ ...prev, [key]: transformed }));
          })
          .catch(() => {});
      };

      fetchSource();
      intervals.push(setInterval(fetchSource, srcDef.refreshMs || 30000));
    }

    return () => intervals.forEach(clearInterval);
  }, [baseUrl, uiDef]);

  // Compute values
  useEffect(() => {
    if (!uiDef?.computed) { setComputed({}); return; }

    const ctx: BindingContext = {
      $data: dataRef.current,
      $sources: sourcesRef.current,
      $env: {
        baseUrl,
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        locale: 'fr-FR',
      },
      $props: widgetItem,
      $layout: layout,
      $computed: {},
    };

    const result: Record<string, any> = {};
    for (const [key, def] of Object.entries(uiDef.computed)) {
      try {
        result[key] = resolveValue(def.expr, { ...ctx, $computed: result });
      } catch {
        result[key] = 0;
      }
    }

    setComputed(result);
  }, [uiDef, data, sources, layout, baseUrl, widgetItem]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout(prev => {
      if (prev.width === Math.round(width) && prev.height === Math.round(height)) return prev;
      return { width: Math.round(width), height: Math.round(height) };
    });
  }, []);

  return { uiDef, data, sources, loading, error, layout, onLayout, computed };
}
