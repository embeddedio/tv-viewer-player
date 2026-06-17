import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'planification', label: 'Planification' },
  { id: 'medias', label: 'Medias' },
  { id: 'widgets', label: 'Widgets' },
  { id: 'configuration', label: 'Configuration' },
];

export default function Nav() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const currentPage = location.pathname.replace('/', '') || 'dashboard';

  return (
    <nav className="sticky top-0 z-[100] bg-[rgb(var(--nav-bg)/0.92)] backdrop-blur-[12px] border-b border-border">
      <div className="max-w-container mx-auto px-5 flex items-center h-14 gap-2">
        <button
          className="md:hidden bg-transparent border-none text-text text-2xl cursor-pointer p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          &#9776;
        </button>
        <img src="/logo.png" alt="TV Viewer" className="h-8 object-contain mr-6" />
        <div className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-1 absolute md:static top-14 left-0 right-0 bg-[rgb(var(--nav-bg)/0.98)] md:bg-transparent p-2 md:p-0 border-b md:border-0 border-border flex-1`}>
          {pages.map(p => (
            <button
              key={p.id}
              onClick={() => { navigate(`/${p.id}`); setMenuOpen(false); }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm border-none cursor-pointer transition-all ${
                currentPage === p.id
                  ? 'text-white bg-accent shadow-[0_2px_10px_rgb(var(--color-accent)/0.35)]'
                  : 'text-text-muted bg-transparent hover:text-text hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-sm font-mono text-text-muted tabular-nums">{clock}</span>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
            className="grid place-items-center w-8 h-8 rounded-md text-text-muted bg-white/5 border border-border cursor-pointer hover:bg-white/10 hover:text-text transition-colors"
          >
            {theme === 'light' ? (
              /* lune */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              /* soleil */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            )}
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red/15 text-red border border-red/30 cursor-pointer hover:bg-red/25"
          >
            Deconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
