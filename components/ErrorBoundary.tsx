import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Délai avant nouvelle tentative de rendu (ms). */
  retryMs?: number;
}
interface State {
  hasError: boolean;
}

/**
 * Garde-fou de rendu : si un composant enfant lève une exception (layout invalide,
 * widget cassé, donnée endommagée…), on affiche un écran de secours au lieu de
 * crasher l'app (white screen / crash-loop). On retente automatiquement le rendu
 * après `retryMs` — un état transitoire peut ainsi se rétablir seul (ex. quand le
 * scheduler passe à une autre séquence valide). Jamais de boucle CPU : retry temporisé.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] rendu en échec:", (error as any)?.message || error);
    if (!this.retryTimer) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.setState({ hasError: false });
      }, this.props.retryMs ?? 4000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.text}>Redémarrage de l'affichage…</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 360, height: 100, marginBottom: 16 },
  text: { color: "rgba(255,255,255,0.6)", fontSize: 16, letterSpacing: 1 },
});
