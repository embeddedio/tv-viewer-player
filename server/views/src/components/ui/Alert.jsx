import { useEffect, useState, useCallback } from 'react';

let alertId = 0;
let addAlertFn = null;

export function showAlert(msg, type = 'success') {
  addAlertFn?.(msg, type);
}

const typeStyles = {
  success: 'bg-green/15 border-green text-green',
  error: 'bg-red/15 border-red text-red',
  warning: 'bg-yellow/15 border-yellow text-yellow',
};

export default function AlertContainer() {
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback((text, type) => {
    const id = ++alertId;
    setAlerts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addAlertFn = addAlert;
    return () => { addAlertFn = null; };
  }, [addAlert]);

  if (!alerts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm">
      {alerts.map(a => (
        <div key={a.id} className={`px-4 py-3 rounded-lg border font-medium text-sm animate-[fadeIn_0.2s] ${typeStyles[a.type]}`}>
          {a.text}
        </div>
      ))}
    </div>
  );
}
