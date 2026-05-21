/**
 * Widget Protocol — contrat de communication entre le serveur Node.js et les widgets RN.
 *
 * Ce fichier définit le protocole officiel. Il doit être copié tel quel dans tv-viewer-app.
 *
 * Principe :
 *  - Le serveur émet des événements via le bridge (Node.js → RN)
 *  - WidgetBridgeProvider écoute ces événements et maintient un état réactif
 *  - Les widgets consomment cet état via useWidgetBridge() — sans rien savoir du bridge
 *  - Pour ajouter un nouvel événement : l'ajouter dans WidgetServerEvent + WidgetBridgeState
 */

// ─── Événements serveur → widgets ────────────────────────────────────────────
// Format JSON envoyé via bridge.js : { type: '...', ...payload }

export type WidgetServerEvent =
  | { type: 'logo-updated'; url: string; name: string }
  | { type: 'logo-deleted' }
  | { type: 'widget-update'; widgetType: string; scope: 'config' | 'data' | 'all' }
  ;

// ─── État réactif exposé aux widgets ─────────────────────────────────────────
// Tout ce qu'un widget peut lire via useWidgetBridge()

export interface WidgetBridgeState {
  /** URL de base du serveur embarqué (ex: "http://127.0.0.1:3000") */
  baseUrl: string;
  /** URL complète du logo configuré, ou null si aucun logo uploadé */
  logoUrl: string | null;
  /** Source du logo par défaut de l'application (require(...) résolu par l'app hôte) */
  defaultLogoSource: any;
  /** Compteur de révision config par widgetType — s'incrémente à chaque widget-update reçu */
  configVersion: Record<string, number>;
  /** Nom du dossier Documents utilisé par l'app (ex: "tv-viewer") — source unique depuis App.tsx */
  storageFolderName: string;
}

// ─── Contrat du provider (ce que l'app hôte doit fournir) ────────────────────
// tv-viewer-dev et tv-viewer-app doivent tous les deux wraper avec ce provider

export interface WidgetBridgeProviderProps {
  /** URL de base du serveur embarqué */
  baseUrl: string;
  /** Module nodejs-mobile-react-native (peut être null en environnement web/test) */
  nodejs: any;
  /** Logo par défaut de l'application, fourni par l'app hôte via require() */
  defaultLogoSource: any;
  /** Nom du dossier Documents — déclaré une seule fois dans App.tsx */
  storageFolderName: string;
  children: React.ReactNode;
}
