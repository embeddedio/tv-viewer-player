# Issues rencontrees et corrections

## 1. `Intl is not defined` — Crash serveur sur Android

**Symptome** : L'endpoint `/api/app/sequences` crashait systematiquement. Le scheduler ne recevait jamais les sequences. Logcat affichait :
```
NODEJS-MOBILE: Unhandled server error ReferenceError: Intl is not defined
```

**Cause** : Le runtime Node.js embedded (`nodejs-mobile`) ne supporte pas l'API `Intl`. La ligne `Intl.DateTimeFormat().resolvedOptions().timeZone` dans `server/server.js` provoquait un crash non gere.

**Fix** : Wraper l'appel dans un try/catch avec fallback `'UTC'` :
```js
let timezone = 'UTC';
try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) {}
```

**Fichier** : `server/server.js` (ligne ~150)

---

## 2. `useVideoSources is not a function` — Import inexistant expo-video

**Symptome** : Crash au runtime :
```
TypeError: 0, _expoVideo.useVideoSources is not a function (it is undefined)
```

**Cause** : `VideoViewWrapper.tsx` importait `useVideoSources` de `expo-video`, qui n'existe pas dans la version installee (v3.0.15). L'API correcte est `useVideoPlayer`.

**Fix** : Remplacer `useVideoSources` par `useVideoPlayer` et utiliser la prop `player` au lieu de `source` sur `<VideoView>` :
```tsx
const player = useVideoPlayer(uri, (p) => {
  p.loop = true;
  p.muted = true;
  p.play();
});
return <VideoView player={player} ... />;
```

**Fichier** : `components/VideoViewWrapper.tsx`

---

## 3. `allowsFullscreen` deprecated — Warning expo-video

**Symptome** : Warning dans la console :
```
The `allowsFullscreen` prop is deprecated and will be removed in a future release.
```

**Fix** : Supprimer la prop `allowsFullscreen={false}` de `<VideoView>`.

**Fichier** : `components/VideoViewWrapper.tsx`

---

## 4. Double fetch des sequences au demarrage

**Symptome** : Logcat montrait deux appels simultanes a `/api/app/sequences` au mount :
```
[Scheduler] Fetching sequences...
[Scheduler] Fetching sequences...
```

**Cause** : Le hook `useScheduler` faisait un fetch initial dans son `useEffect` de mount, ET `App.tsx` appelait `refetchSequences()` via `fetchAll()` dans son propre effet de mount.

**Fix** : Retirer le fetch initial du hook. `App.tsx` declenche le premier fetch via `fetchAll()` (appele au mount et sur `server-ready`).

**Fichier** : `hooks/useScheduler.ts`

---

## 5. Stale closure dans le scheduler

**Symptome** : Les sequences se chargeaient mais `activeDisplay` ne se mettait pas a jour apres un changement cote admin.

**Cause** : `evaluate` etait un `useCallback` capture par `fetchSequences` via closure. Quand `fetchSequences` etait appele suite a un bridge event, il appelait une version perimee de `evaluate` qui ne voyait pas les nouvelles sequences.

**Fix** : Utiliser un `useRef` (`evaluateRef`) pour stocker la fonction `evaluate`. `fetchSequences` appelle toujours `evaluateRef.current()` qui pointe vers la derniere version.

**Fichier** : `hooks/useScheduler.ts`

---

## 6. App affichait les medias uploades au lieu du contenu des sequences

**Symptome** : L'app affichait tous les medias uploades directement, au lieu de lire le contenu defini dans les sequences.

**Cause** : L'ancien code avait deux chemins d'affichage :
- `fetchContentWithRetry()` → `/content` → `playlist` (tous les medias uploades)
- `useScheduler()` → sequences → `activeDisplay` → `LayoutRenderer`

Quand `activeDisplay` etait null, le fallback affichait la `playlist` globale. Et meme avec une sequence active, `playlist` etait passee en prop a `ZoneContent` comme fallback legacy.

**Fix** :
- Supprimer `playlist`, `fetchContentWithRetry`, `setPlaylistFromServer` de `App.tsx`
- Supprimer la prop `playlist` de `LayoutRenderer` et `ZoneContent`
- Supprimer le fallback legacy (filtrage par `fileNames`) dans `ZoneContent`
- Quand aucune sequence active : afficher uniquement logo/BIENVENU

**Fichiers** : `App.tsx`, `components/LayoutRenderer.tsx`, `components/ZoneContent.tsx`

---

## 7. Bridge listener en doublon pour les sequences

**Symptome** : Les messages `sequences-updated` / `display-schedule-updated` n'etaient pas traites correctement.

**Cause** : La premiere version du hook avait son propre bridge listener dans un `useEffect` separe, en doublon avec celui de `App.tsx`. Les deux ecoutaient le meme channel, causant des conflits.

**Fix** : Retirer le bridge listener du hook. `App.tsx` gere tous les messages bridge et appelle `refetchSequences()` quand necessaire.

**Fichiers** : `hooks/useScheduler.ts`, `App.tsx`
