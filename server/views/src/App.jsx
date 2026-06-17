import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Nav from './components/layout/Nav';
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard/DashboardPage';
import PlanificationPage from './pages/Planification/PlanificationPage';
import MediasPage from './pages/Medias/MediasPage';
import ConfigurationPage from './pages/Configuration/ConfigurationPage';
import WidgetsPage from './pages/Widgets/WidgetsPage';
import Spinner from './components/ui/Spinner';
import UploadToast from './components/ui/UploadToast';

function AppRoutes() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!authenticated) {
    return <Login />;
  }

  return (
    <AppProvider>
      <UploadToast />
      <div className="flex flex-col h-[100dvh] overflow-hidden max-md:h-auto max-md:min-h-[100dvh] max-md:overflow-y-auto">
        <Nav />
        <div className="flex-1 min-h-0 overflow-hidden max-md:overflow-visible">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/planification" element={<PlanificationPage />} />
            <Route path="/medias" element={<MediasPage />} />
            <Route path="/widgets" element={<WidgetsPage />} />
            <Route path="/configuration" element={<ConfigurationPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
