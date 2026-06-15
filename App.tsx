import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Image, LogBox, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { captureScreen, captureRef } from 'react-native-view-shot';

LogBox.ignoreLogs(["The app is running using the Legacy Architecture"]);
import * as FileSystem from "expo-file-system/legacy";
import LayoutRenderer from "./components/LayoutRenderer";
import SplashScreen from "./components/SplashScreen";
import { useScheduler } from "./hooks/useScheduler";
import { useTvSchedule } from "./hooks/useTvSchedule";
import { WidgetBridgeProvider } from "./contexts/WidgetBridgeContext";

const BASE_URL = "http://127.0.0.1:3000";
const TICKER_CACHE_FILE = (FileSystem.documentDirectory ?? "") + "ticker_cache.json";
const FOLDER_NAME = "tv-viewer";
const DEFAULT_STORAGE_PATH = "/storage/emulated/0/Documents/" + FOLDER_NAME;

const DEFAULT_TICKER_ITEMS = [
  { code: "USD", label: "Dollar US", icon: "$", buyLabel: "Achat", buy: "-", sellLabel: "Vente", sell: "-" },
  { code: "EUR", label: "Euro", icon: "€", buyLabel: "Achat", buy: "-", sellLabel: "Vente", sell: "-" },
  { code: "GBP", label: "Livre", icon: "£", buyLabel: "Achat", buy: "-", sellLabel: "Vente", sell: "-" },
];

const DEFAULT_TICKER_CONFIG = {
  heightPercent: 10,
  itemGap: 28,
  scale: 90,
  speed: 100,
  items: DEFAULT_TICKER_ITEMS,
};

type TickerConfig = typeof DEFAULT_TICKER_CONFIG;
// checking         : vérification de la permission au démarrage
// needs-permission : MANAGE_EXTERNAL_STORAGE non accordée → écran dédié
// granted          : permission OK, Node.js peut démarrer
type PermState = "checking" | "needs-permission" | "granted";

let nodejs: typeof import("nodejs-mobile-react-native") | null = null;
let nodejsBootstrapError: string | null = null;
try {
  nodejs = require("nodejs-mobile-react-native");
} catch (error: any) {
  nodejsBootstrapError = error?.message || "nodejs-mobile-react-native indisponible";
}

function fetchJson(url: string): Promise<any> {
  return fetch(url).then((r) => r.json());
}

function fetchWithRetry(url: string, retryMs = 1500): Promise<any> {
  return fetchJson(url).catch(() =>
    new Promise((resolve) => setTimeout(resolve, retryMs)).then(() => fetchJson(url))
  );
}

export default function App() {
  const nodeStartedRef = useRef(false);
  const bridgeReadyRef = useRef(false);
  const serverReadyRef = useRef(false);
  const storagePathRef = useRef<string>("");
  const launcherConfigRef = useRef<{ updateEndpoint: string; remoteServerUrl: string } | null>(null);
  const viewRef = useRef<View>(null);
  const offscreenViewRef = useRef<View>(null);
  const rotationRef = useRef("landscape-left");

  const [permState, setPermState] = useState<PermState>("checking");
  const [permBtnFocused, setPermBtnFocused] = useState(false);
  const [storagePath, setStoragePath] = useState<string>("");
  const [tickerConfig, setTickerConfig] = useState<TickerConfig>(DEFAULT_TICKER_CONFIG);
  const [logoInfo, setLogoInfo] = useState<{ url: string; name: string } | null>(null);
  const [rotation, setRotation] = useState("landscape-left");
  // 'screen' inclut la zone nav bar (plein écran physique) — nécessaire en mode immersif kiosk
  const [screenDims, setScreenDims] = useState(Dimensions.get("screen"));
  const [nodeError, setNodeError] = useState<string | null>(nodejsBootstrapError);
  const [splashDone, setSplashDone] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [previewOverride, setPreviewOverride] = useState<any>(null);
  const [offscreenDisplay, setOffscreenDisplay] = useState<any>(null);

  const { activeDisplay, refetchSequences } = useScheduler(BASE_URL);
  const { fetchSchedule, applySchedule } = useTvSchedule(BASE_URL);

  // --- Récupère la config serveur depuis le launcher ---
  const fetchLauncherConfig = useCallback(async () => {
    try {
      const cfg = await NativeModules.LauncherConfig?.getServerConfig?.();
      if (cfg) launcherConfigRef.current = cfg;
    } catch {}
  }, []);

  // --- Initialise le dossier Documents et passe à l'état granted ---
  const initAndGrant = useCallback(async () => {
    const mod = NativeModules.StorageModule;
    await fetchLauncherConfig();
    const result: { path: string; isEmpty: boolean; fileCount: number } = await mod.initFolder(FOLDER_NAME);
    storagePathRef.current = result.path;
    setStoragePath(result.path);
    await mod.seedDefaultWidgets(result.path + "/widgets").catch(() => {});
    setPermState("granted");
  }, [fetchLauncherConfig]);

  // --- Vérification permission au démarrage ---
  useEffect(() => {
    (async () => {
      try {
        const mod = NativeModules.StorageModule;
        if (!mod) {
          setStoragePath(DEFAULT_STORAGE_PATH);
          setPermState("granted");
          return;
        }
        const hasAccess: boolean = await mod.hasAccess();
        if (!hasAccess) {
          if (Platform.Version < 30) {
            // Android 9/10 : demander WRITE_EXTERNAL_STORAGE via dialog runtime
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
            if (result === PermissionsAndroid.RESULTS.GRANTED) {
              await initAndGrant();
              return;
            }
          }
          setPermState("needs-permission");
          return;
        }
        await initAndGrant();
      } catch {
        setStoragePath(DEFAULT_STORAGE_PATH);
        setPermState("granted");
      }
    })();
  }, [initAndGrant]);

  // --- Re-check quand l'utilisateur revient de Settings ---
  useEffect(() => {
    if (permState !== "needs-permission") return;
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      try {
        const mod = NativeModules.StorageModule;
        const hasAccess: boolean = await mod.hasAccess();
        if (!hasAccess) return;
        await initAndGrant();
      } catch {}
    });
    return () => sub.remove();
  }, [permState, initAndGrant]);

  // --- Écoute les changements de config serveur depuis le launcher ---
  useEffect(() => {
    if (!NativeModules.LauncherConfig) return;
    const emitter = new NativeEventEmitter(NativeModules.LauncherConfig);
    const sub = emitter.addListener("serverConfigChanged", (cfg) => {
      launcherConfigRef.current = cfg;
      if (nodejs && serverReadyRef.current) {
        nodejs.channel.send(JSON.stringify({ type: "launcher-config-changed", launcherConfig: cfg }));
      }
    });
    return () => sub.remove();
  }, []);

  // --- Screen dimensions ---
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ screen }) => setScreenDims(screen));
    return () => sub?.remove();
  }, []);

  // --- Ticker cache (stockage interne app, indépendant du stockage externe) ---
  useEffect(() => {
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(TICKER_CACHE_FILE);
        if (info.exists) {
          const items = JSON.parse(await FileSystem.readAsStringAsync(TICKER_CACHE_FILE));
          if (Array.isArray(items) && items.length > 0) {
            setTickerConfig((prev) => ({ ...prev, items }));
          }
        }
      } catch {}
    })();
  }, []);

  const saveTickerCache = useCallback(async (items: any[]) => {
    try {
      await FileSystem.writeAsStringAsync(TICKER_CACHE_FILE, JSON.stringify(items));
    } catch {}
  }, []);

  // --- Apply helpers ---
  const applySettings = useCallback((d: any) => {
    if (d?.orientation) setRotation(d.orientation);
    if (d?.ticker) {
      setTickerConfig((prev) => ({
        ...prev,
        heightPercent: Number(d.ticker.heightPercent) || prev.heightPercent,
        scale: Number(d.ticker.scale) || prev.scale,
        speed: Number(d.ticker.speed) || prev.speed,
        itemGap: Number(d.ticker.itemGap) || prev.itemGap,
        items: Array.isArray(d.ticker.items) && d.ticker.items.length ? d.ticker.items : prev.items,
      }));
    }
  }, []);

  const applyDevises = useCallback((items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setTickerConfig((prev) => ({ ...prev, items }));
    saveTickerCache(items);
  }, [saveTickerCache]);

  const applyLogo = useCallback((d: any) => {
    if (d?.logo?.url) {
      setLogoInfo({ url: `${BASE_URL}${d.logo.url}`, name: d.logo.name });
    } else {
      setLogoInfo(null);
    }
  }, []);

  const fetchSettings = useCallback(() => {
    fetchWithRetry(`${BASE_URL}/settings`).then(applySettings).catch(() => {});
  }, [applySettings]);

  const fetchDevises = useCallback(() => {
    fetchWithRetry(`${BASE_URL}/devises`)
      .then((d) => applyDevises(d?.items))
      .catch(() => {});
  }, [applyDevises]);

  const fetchLogo = useCallback(() => {
    fetchJson(`${BASE_URL}/logo/info`).then(applyLogo).catch(() => {});
  }, [applyLogo]);

  const fetchAll = useCallback(() => {
    fetchSettings();
    fetchDevises();
    fetchLogo();
    refetchSequences();
    fetchSchedule();
  }, [fetchSettings, fetchDevises, fetchLogo, refetchSequences, fetchSchedule]);

  // --- Bridge listener — démarre uniquement après permission accordée ---
  useEffect(() => {
    if (permState !== "granted") return;
    if (!nodejs) return;

    const sub = nodejs.channel.addListener("message", (msg: string) => {
      try {
        const p = JSON.parse(msg);
        switch (p?.type) {
          case "node-ready":
            nodejs?.channel.send(JSON.stringify({
              type: "storage-path",
              path: storagePathRef.current || DEFAULT_STORAGE_PATH,
              launcherConfig: launcherConfigRef.current,
            }));
            break;
          case "server-ready":
            serverReadyRef.current = true;
            setNodeError(null);
            setServerReady(true);
            fetchAll();
            break;
          case "server-error":
            setNodeError(p?.message || "Erreur serveur Node");
            setServerReady(false);
            break;
          case "logo-updated":
            if (p.url) setLogoInfo({ url: `${BASE_URL}${p.url}`, name: p.name || "Logo" });
            break;
          case "logo-deleted":
            setLogoInfo(null);
            break;
          case "display-settings":
            applySettings(p);
            break;
          case "display-rotation":
            if (p.orientation) setRotation(p.orientation);
            break;
          case "display-ecart":
            if (p.itemGap !== undefined)
              setTickerConfig((prev) => ({
                ...prev,
                itemGap: Math.max(0, Math.min(200, Math.trunc(Number(p.itemGap)))),
              }));
            break;
          case "display-devises":
            applyDevises(p.items);
            break;
          case "sequences-updated":
          case "display-schedule-updated":
            refetchSequences();
            break;
          case "tv-schedule-updated":
            if (p.schedule) applySchedule(p.schedule);
            break;
          case "capture-request": {
            setTimeout(async () => {
              const sendResult = (payload: object) => {
                nodejs?.channel.send(JSON.stringify({ type: 'capture-result', ...payload }));
              };
              try {
                const base64 = await Promise.race<string>([
                  captureScreen({ format: 'jpg', quality: 0.7, result: 'base64' }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('captureScreen timeout 8s')), 8000)
                  ),
                ]);
                if (!base64) throw new Error('captureScreen returned empty');
                sendResult({ image: `data:image/jpeg;base64,${base64}`, rotation: rotationRef.current });
              } catch (e: any) {
                sendResult({ captureError: e?.message || 'capture failed' });
              }
            }, 0);
            break;
          }
          case "preview-sequence": {
            if (!p.display) break;
            setOffscreenDisplay(p.display);
            setTimeout(async () => {
              const sendResult = (payload: object) => {
                nodejs?.channel.send(JSON.stringify({ type: 'capture-result', ...payload }));
              };
              try {
                if (!offscreenViewRef.current) throw new Error('offscreen view not mounted');
                const base64 = await Promise.race<string>([
                  captureRef(offscreenViewRef.current, { format: 'jpg', quality: 0.7, result: 'base64' }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('captureRef timeout 8s')), 8000)
                  ),
                ]);
                if (!base64) throw new Error('captureRef returned empty');
                sendResult({ image: `data:image/jpeg;base64,${base64}`, rotation: 'landscape-left' });
              } catch (e: any) {
                sendResult({ captureError: e?.message || 'captureRef failed' });
              } finally {
                setOffscreenDisplay(null);
              }
            }, 2000);
            break;
          }
        }
      } catch (e) {
        console.error("[App] Bridge message parse error:", e);
      }
    });

    bridgeReadyRef.current = true;
    return () => sub?.remove?.();
  }, [permState, fetchAll, applySettings, applyDevises, refetchSequences, applySchedule]);

  // --- Démarrage Node.js — après bridge attaché + chemin connu ---
  useEffect(() => {
    if (permState !== "granted") return;
    if (nodeStartedRef.current) return;
    if (!bridgeReadyRef.current) return;
    if (!nodejs || typeof nodejs.start !== "function") {
      setNodeError((prev) => prev || "Module Node.js embarqué indisponible");
      return;
    }

    nodejs.start("main.js");
    nodeStartedRef.current = true;
    // Les chemins sont envoyés en réponse au message "node-ready" de Node.js

    // Fallback : server déjà actif (rechargement Metro sans restart Node)
    const t = setTimeout(() => {
      if (serverReadyRef.current) return;
      fetch(`${BASE_URL}/settings`)
        .then(() => {
          if (serverReadyRef.current) return;
          serverReadyRef.current = true;
          setServerReady(true);
          fetchAll();
        })
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [permState, storagePath, fetchAll]);

  // Ref pour éviter les stale closures dans le bridge listener
  rotationRef.current = rotation;

  // Re-cache les barres système à chaque changement d'orientation (portrait ↔ paysage)
  useEffect(() => {
    NativeModules.SystemUI?.hideSystemBars?.();
  }, [rotation]);

  // --- Rotation style ---
  const layoutStyle = (() => {
    const { width, height } = screenDims;
    switch (rotation) {
      case "portrait-up":
        return { transform: [{ rotate: "90deg" }], width: height, height: width, position: "absolute" as const, left: (width - height) / 2, top: (height - width) / 2 };
      case "portrait-down":
        return { transform: [{ rotate: "270deg" }], width: height, height: width, position: "absolute" as const, left: (width - height) / 2, top: (height - width) / 2 };
      case "landscape-right":
        return { transform: [{ rotate: "180deg" }], width, height };
      default:
        return { width, height };
    }
  })();

  const tickerItems = tickerConfig.items?.length > 0 ? tickerConfig.items : DEFAULT_TICKER_ITEMS;

  // --- Vérification en cours ---
  if (permState === "checking") {
    return (
      <View style={styles.permScreen}>
        <ActivityIndicator color="#facc15" size="large" />
      </View>
    );
  }

  // --- Permission stockage requise ---
  if (permState === "needs-permission") {
    const isLegacyStorage = Platform.Version < 30;
    return (
      <View style={styles.permScreen}>
        <Image source={require("./assets/images/logo.png")} style={styles.permLogo} resizeMode="contain" />
        <Text style={styles.permTitle}>Autorisation requise</Text>
        {isLegacyStorage ? (
          <Text style={styles.permText}>
            L'application a besoin d'accéder au dossier{" "}
            <Text style={{ color: "#facc15", fontWeight: "700" }}>Documents</Text>{" "}
            pour stocker vos médias et configurations.{"\n\n"}
            Les réglages de l'application vont s'ouvrir — accordez la permission{" "}
            <Text style={{ color: "#facc15", fontWeight: "700" }}>Stockage</Text>{" "}
            puis revenez dans l'application.
          </Text>
        ) : (
          <Text style={styles.permText}>
            L'application a besoin d'accéder au dossier{" "}
            <Text style={{ color: "#facc15", fontWeight: "700" }}>Documents</Text>{" "}
            pour stocker vos médias et configurations.{"\n\n"}
            Une page de réglages va s'ouvrir — activez l'interrupteur{" "}
            <Text style={{ color: "#facc15", fontWeight: "700" }}>
              "Autoriser la gestion de tous les fichiers"
            </Text>{" "}
            puis revenez dans l'application.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.permBtn, permBtnFocused && styles.permBtnFocused]}
          hasTVPreferredFocus
          activeOpacity={0.85}
          onFocus={() => setPermBtnFocused(true)}
          onBlur={() => setPermBtnFocused(false)}
          onPress={() => {
            NativeModules.StorageModule.requestAccess().catch(() => {});
          }}
        >
          <Text style={[styles.permBtnText, styles.permBtnPrimary]}>Ouvrir les réglages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WidgetBridgeProvider
      baseUrl={BASE_URL}
      nodejs={nodejs}
      defaultLogoSource={require("./assets/images/logo.png")}
      storageFolderName={FOLDER_NAME}
    >
      <View ref={viewRef} collapsable={false} style={[styles.screen, layoutStyle]}>
        {!splashDone && (
          <SplashScreen
            ready={serverReady}
            errorMessage={nodeError}
            onFinish={() => setSplashDone(true)}
          />
        )}
        {(previewOverride || activeDisplay) ? (
          <LayoutRenderer
            layoutId={(previewOverride || activeDisplay).layoutId}
            activeDisplay={previewOverride || activeDisplay}
            tickerConfig={tickerConfig}
            tickerItems={tickerItems}
            logoInfo={logoInfo}
            baseUrl={BASE_URL}
            rotation={rotation}
          />
        ) : (
          <View style={styles.fallback}>
            {logoInfo?.url ? (
              <Image source={{ uri: logoInfo.url }} style={styles.logoFull} resizeMode="stretch" />
            ) : (
              <View style={styles.fallbackCenter}>
                <Image source={require("./assets/images/logo.png")} style={styles.fallbackLogo} resizeMode="contain" />
                <Text style={styles.welcomeText}>Bienvenue</Text>
                {nodeError ? <Text style={styles.errorText}>{nodeError}</Text> : null}
              </View>
            )}
          </View>
        )}
      </View>
      {offscreenDisplay && (
        <View
          ref={offscreenViewRef}
          collapsable={false}
          style={[styles.offscreen, { left: screenDims.width }]}
        >
          <LayoutRenderer
            layoutId={offscreenDisplay.layoutId}
            activeDisplay={offscreenDisplay}
            tickerConfig={tickerConfig}
            tickerItems={tickerItems}
            logoInfo={logoInfo}
            baseUrl={BASE_URL}
            rotation="landscape-left"
          />
        </View>
      )}
    </WidgetBridgeProvider>
  );
}

const styles = StyleSheet.create({
  permScreen: {
    flex: 1,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 20,
  },
  permLogo: {
    width: 320,
    height: 90,
    marginBottom: 8,
  },
  permTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f1f5f9",
    textAlign: "center",
  },
  permText: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 600,
  },
  permBtn: {
    marginTop: 12,
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: "#facc15",
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "transparent",
  },
  permBtnFocused: {
    borderColor: "#fff",
    transform: [{ scale: 1.05 }],
  },
  permBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    textAlign: "center",
  },
  permBtnPrimary: {
    color: "#030712",
  },
  screen: {
    flex: 1,
    padding: 5,
    backgroundColor: "#030712",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  logoFull: {
    width: "100%",
    height: "100%",
  },
  fallbackCenter: {
    alignItems: "center",
  },
  fallbackLogo: {
    width: 500,
    height: 140,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    marginTop: 16,
    letterSpacing: 2,
  },
  errorText: {
    marginTop: 16,
    maxWidth: 700,
    textAlign: "center",
    fontSize: 16,
    color: "#fca5a5",
  },
  offscreen: {
    position: 'absolute',
    top: 0,
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
    backgroundColor: '#030712',
  },
});
