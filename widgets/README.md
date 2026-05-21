# Widgets

Dossier vide — les widgets sont developpés ici.

## Creer un nouveau widget

1. Créer `widgets/MonWidget.tsx` (composant autonome avec fetch interne)
2. L'importer dans `components/WidgetRenderer.tsx` + ajouter dans `WIDGETS`
3. Ajouter dans `server/server.js` : entrée dans `REGISTERED_WIDGETS` + route GET

## Structure d'un widget autonome

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function MonWidget({ baseUrl }: { baseUrl: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetch(`${baseUrl}/api/widgets/mon-widget`)
        .then(r => r.json())
        .then(res => { setData(res.rates || []); setLoading(false); })
        .catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  if (loading) return <ActivityIndicator color="#fff" style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1 }}>
      {/* Rendu du widget */}
    </View>
  );
}
```
