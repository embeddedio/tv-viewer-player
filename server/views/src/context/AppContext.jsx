import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { authenticated } = useAuth();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [allSequences, setAllSequences] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [orientation, setOrientation] = useState('portrait-up');
  const [screenConfig, setScreenConfig] = useState(null);
  const [logoInfo, setLogoInfo] = useState(null);
  const [widgets, setWidgets] = useState([]);

  const reloadMedia = useCallback(async () => {
    const r = await api('/files');
    setMediaFiles(r?.files || []);
  }, []);

  const reloadFolders = useCallback(async () => {
    const r = await api('/folders');
    setFolders(r?.folders || []);
  }, []);

  const reloadSequences = useCallback(async () => {
    const r = await api('/api/sequences');
    setAllSequences(r || []);
  }, []);

  const reloadLogo = useCallback(async () => {
    const r = await api('/logo/info');
    setLogoInfo(r?.logo || null);
  }, []);

  const reloadWidgets = useCallback(async () => {
    const r = await api('/api/widgets');
    setWidgets(Array.isArray(r) ? r : []);
  }, []);

  const reload = useCallback(async () => {
    const [filesR, foldersR, seqR, layR, settingsR, logoR, widgetsR] = await Promise.all([
      api('/files'),
      api('/folders'),
      api('/api/sequences'),
      api('/api/layouts'),
      api('/settings'),
      api('/logo/info'),
      api('/api/widgets'),
    ]);
    setMediaFiles(filesR?.files || []);
    setFolders(foldersR?.folders || []);
    setAllSequences(seqR || []);
    setLayouts(layR || {});
    setScreenConfig(settingsR || null);
    setOrientation(settingsR?.orientation || 'portrait-up');
    setLogoInfo(logoR?.logo || null);
    setWidgets(Array.isArray(widgetsR) ? widgetsR : []);
  }, []);

  useEffect(() => {
    if (authenticated) {
      reload();
    }
  }, [authenticated, reload]);

  return (
    <AppContext.Provider
      value={{
        mediaFiles, folders, allSequences, layouts, orientation, screenConfig, logoInfo, widgets,
        reload, reloadMedia, reloadFolders, reloadSequences, reloadLogo, reloadWidgets,
        setOrientation, setScreenConfig, setAllSequences, setMediaFiles, setLogoInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
