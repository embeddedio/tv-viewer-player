import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const pages = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'planification', label: 'Planification' },
  { id: 'medias', label: 'Medias' },
  { id: 'configuration', label: 'Configuration' },
];

export default function Nav() {
  const { logout } = useAuth();
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
    <nav className="sticky top-0 z-[100] bg-[rgba(3,7,18,0.92)] backdrop-blur-[12px] border-b border-border">
      <div className="max-w-container mx-auto px-5 flex items-center h-14 gap-2">
        <button
          className="md:hidden bg-transparent border-none text-text text-2xl cursor-pointer p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          &#9776;
        </button>
        <img src="/logo.png" alt="TV Viewer" className="h-8 object-contain mr-6" />
        <div className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-1 absolute md:static top-14 left-0 right-0 bg-[rgba(3,7,18,0.98)] md:bg-transparent p-2 md:p-0 border-b md:border-0 border-border flex-1`}>
          {pages.map(p => (
            <button
              key={p.id}
              onClick={() => { navigate(`/${p.id}`); setMenuOpen(false); }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm border-none cursor-pointer transition-all ${
                currentPage === p.id
                  ? 'text-bg bg-gradient-to-br from-green to-accent'
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
