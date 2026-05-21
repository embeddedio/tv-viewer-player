import Card from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { api } from '../../api';
import { showAlert } from '../../components/ui/Alert';
import { ORIENTATIONS } from '../../constants';

export default function OrientationCard() {
  const { orientation, setOrientation } = useApp();

  const handleClick = async (id) => {
    const r = await api('/rotation', {
      method: 'POST',
      body: JSON.stringify({ orientation: id }),
    });
    if (r?.success) {
      setOrientation(r.orientation);
      showAlert('Orientation mise a jour');
    }
  };

  return (
    <Card title="Orientation de l'ecran">
      <div className="grid grid-cols-2 gap-3">
        {ORIENTATIONS.map(o => (
          <div
            key={o.id}
            onClick={() => handleClick(o.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer text-center transition-all ${
              o.id === orientation
                ? 'border-accent bg-accent/[0.08]'
                : 'border-border hover:border-text-muted'
            }`}
          >
            <div className="text-2xl mb-1">{o.icon}</div>
            <div className="text-xs text-text-muted">{o.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
