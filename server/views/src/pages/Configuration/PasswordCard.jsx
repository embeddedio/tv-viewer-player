import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormGroup from '../../components/ui/FormGroup';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { showAlert } from '../../components/ui/Alert';

export default function PasswordCard() {
  const { isDefaultPassword, setIsDefaultPassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const handleChange = async () => {
    if (!current || !newPw) return showAlert('Veuillez remplir tous les champs', 'error');
    if (newPw !== confirmPw) return showAlert('Les mots de passe ne correspondent pas', 'error');
    if (newPw.length < 4) return showAlert('Minimum 4 caracteres', 'error');
    const r = await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
    });
    if (r?.success) {
      setIsDefaultPassword(false);
      setCurrent('');
      setNewPw('');
      setConfirmPw('');
      showAlert('Mot de passe change');
    } else {
      showAlert(r?.message || 'Erreur', 'error');
    }
  };

  const inputClass = 'w-full px-3 py-2.5 bg-black/30 border border-border rounded-lg text-text text-[0.9rem] focus:outline-none focus:border-accent';

  return (
    <Card title="Changer le mot de passe">
      {isDefaultPassword && (
        <div className="bg-yellow/15 border border-yellow text-yellow px-4 py-3 rounded-lg mb-4 text-sm font-medium">
          Mot de passe par defaut actif. Veuillez le changer.
        </div>
      )}
      <FormGroup label="Mot de passe actuel">
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} />
      </FormGroup>
      <FormGroup label="Nouveau mot de passe">
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inputClass} />
      </FormGroup>
      <FormGroup label="Confirmer">
        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputClass} />
      </FormGroup>
      <Button onClick={handleChange}>Changer</Button>
    </Card>
  );
}
