/**
 * WidgetBridgeContext — implémentation du protocole widget côté React Native.
 *
 * Ce fichier doit être copié tel quel dans tv-viewer-app.
 *
 * Autonome : gère son propre listener bridge, sans dépendre d'App.tsx.
 * L'app hôte n'a qu'à wrapper avec <WidgetBridgeProvider> et fournir
 * baseUrl, nodejs, defaultLogoSource et storageFolderName.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { WidgetBridgeState, WidgetBridgeProviderProps, WidgetServerEvent } from '../shared/widgetProtocol';

const WidgetBridgeContext = createContext<WidgetBridgeState>({
  baseUrl: '',
  logoUrl: null,
  defaultLogoSource: null,
  configVersion: {},
  storageFolderName: '',
});

export function WidgetBridgeProvider({ baseUrl, nodejs, defaultLogoSource, storageFolderName, children }: WidgetBridgeProviderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [configVersion, setConfigVersion] = useState<Record<string, number>>({});

  // Chargement initial du logo depuis le serveur
  useEffect(() => {
    fetch(`${baseUrl}/logo/info`)
      .then(r => r.json())
      .then(info => setLogoUrl(info?.logo?.url ? baseUrl + info.logo.url : null))
      .catch(() => {});
  }, [baseUrl]);

  // Listener bridge — autonome, indépendant d'App.tsx
  useEffect(() => {
    if (!nodejs?.channel) return;
    const sub = nodejs.channel.addListener('message', (msg: string) => {
      try {
        const event: WidgetServerEvent = JSON.parse(msg);
        switch (event.type) {
          case 'logo-updated':
            setLogoUrl(baseUrl + event.url);
            break;
          case 'logo-deleted':
            setLogoUrl(null);
            break;
          case 'widget-update':
            setConfigVersion(prev => ({ ...prev, [event.widgetType]: (prev[event.widgetType] || 0) + 1 }));
            break;
        }
      } catch {}
    });
    return () => sub?.remove?.();
  }, [baseUrl, nodejs]);

  return (
    <WidgetBridgeContext.Provider value={{ baseUrl, logoUrl, defaultLogoSource, configVersion, storageFolderName }}>
      {children}
    </WidgetBridgeContext.Provider>
  );
}

/** Hook utilisé par tous les widgets pour accéder à l'état réactif du serveur. */
export function useWidgetBridge(): WidgetBridgeState {
  return useContext(WidgetBridgeContext);
}
