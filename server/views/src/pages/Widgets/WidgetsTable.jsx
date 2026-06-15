import { useState } from 'react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { showAlert } from '../../components/ui/Alert';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import WidgetsInstallModal from './WidgetsInstallModal';

export default function WidgetsTable() {
  const { widgets, reloadWidgets } = useApp();
  const [showInstall, setShowInstall] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (type, label) => {
    if (!confirm(`Supprimer le widget "${label}" ?`)) return;
    setDeleting(type);
    try {
      const r = await api(`/api/widgets/${type}`, { method: 'DELETE' });
      if (r?.success) {
        showAlert(`Widget "${label}" supprimé`);
        reloadWidgets();
      } else {
        showAlert(r?.message || 'Erreur lors de la suppression', 'error');
      }
    } catch {
      showAlert('Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="text-sm text-text-muted">
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''} installé{widgets.length !== 1 ? 's' : ''}
        </span>
        <Button variant="primary" sm onClick={() => setShowInstall(true)}>
          + Installer un widget
        </Button>
      </div>

      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-text-muted">
          <span className="text-4xl">🧩</span>
          <p className="text-sm">Aucun widget installé</p>
          <Button variant="secondary" sm onClick={() => setShowInstall(true)}>
            Installer un widget
          </Button>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-xs uppercase">
              <th className="px-5 py-3 text-left font-semibold">Widget</th>
              <th className="px-5 py-3 text-left font-semibold">Type</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {widgets.map((w) => (
              <tr key={w.type} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{w.icon || '🧩'}</span>
                    <span className="font-medium text-text">{w.label}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.06] text-text-muted border border-border">
                    {w.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {deleting === w.type ? (
                    <Spinner className="w-4 h-4 inline-block" />
                  ) : (
                    <Button variant="danger" sm onClick={() => handleDelete(w.type, w.label)}>
                      Supprimer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showInstall && (
        <WidgetsInstallModal
          onClose={() => setShowInstall(false)}
          onInstalled={reloadWidgets}
        />
      )}
    </div>
  );
}
