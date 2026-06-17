import { useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, Text, View } from "react-native";

const logoImage = require("../assets/images/logo.png");
const MIN_DISPLAY_MS = 5000;
// Garde-fou : on ne reste jamais bloqué sur le splash, même si le serveur ne
// répond pas (ex. boîtier sans réseau au démarrage). Passé ce délai, on démarre.
const MAX_DISPLAY_MS = 12000;

type NetInfo = { type: string; ip: string };

function useNetworkAddresses(): NetInfo[] {
  const [addresses, setAddresses] = useState<NetInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchIps = async () => {
      try {
        const res = await fetch("http://127.0.0.1:3000/api/network-info");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setAddresses(data);
      } catch (_) {
        if (!cancelled) setTimeout(fetchIps, 2000);
      }
    };
    fetchIps();
    return () => { cancelled = true; };
  }, []);

  return addresses;
}

interface Props {
  /** Signal de l'app : serveur prêt + config chargée */
  ready: boolean;
  errorMessage?: string | null;
  onFinish: () => void;
}

export default function SplashScreen({ ready, errorMessage = null, onFinish }: Props) {
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [minElapsed, setMinElapsed] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const finishedRef = useRef(false);
  const addresses = useNetworkAddresses();

  // Timer minimum 5s
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Garde-fou : dismiss forcé après MAX_DISPLAY_MS quoi qu'il arrive
  useEffect(() => {
    const t = setTimeout(() => setMaxElapsed(true), MAX_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Dismiss dès que le serveur est prêt (ou erreur) après le minimum,
  // OU au plus tard à l'expiration du garde-fou (jamais figé).
  useEffect(() => {
    const canDismiss = (minElapsed && (ready || errorMessage)) || maxElapsed;
    if (!canDismiss || finishedRef.current) return;
    finishedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => onFinish());
  }, [minElapsed, maxElapsed, ready, errorMessage, onFinish, fadeAnim]);

  // Indicateur visuel si on attend le serveur après les 5s
  useEffect(() => {
    if (minElapsed && !ready && !errorMessage) setWaiting(true);
  }, [minElapsed, ready, errorMessage]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.center}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        <Text style={styles.welcome}>Bienvenue</Text>
      </View>

      {/* Indicateur d'attente si le serveur tarde après 5s */}
      {waiting && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>Connexion au serveur...</Text>
        </View>
      )}

      {errorMessage ? (
        <View style={styles.waitingBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Infos réseau */}
      <View style={styles.networkBox}>
        <Text style={styles.networkTitle}>Adresse d'administration</Text>
        {addresses.length > 0 ? (
          addresses.map((a, i) => (
            <View key={i} style={styles.networkRow}>
              <Text style={styles.networkType}>{a.type}</Text>
              <Text style={styles.networkIp}>{a.ip}:3000</Text>
            </View>
          ))
        ) : (
          <Text style={styles.networkDim}>Recherche du reseau...</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#030712",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    alignItems: "center",
  },
  logo: {
    width: 500,
    height: 140,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    marginTop: 16,
    letterSpacing: 2,
  },
  waitingBox: {
    position: "absolute",
    bottom: 90,
    alignItems: "center",
  },
  waitingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
  },
  errorText: {
    maxWidth: 760,
    textAlign: "center",
    fontSize: 15,
    color: "#fca5a5",
  },
  networkBox: {
    position: "absolute",
    bottom: 30,
    right: 30,
    alignItems: "flex-end",
  },
  networkTitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 6,
  },
  networkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  networkType: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10b981",
    marginRight: 8,
    textTransform: "uppercase",
  },
  networkIp: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  networkDim: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
});
