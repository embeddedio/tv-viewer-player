import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

export default function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setLoading(true);
    setError('');
    const r = await login(password);
    setLoading(false);
    if (!r.success) {
      setError(r.message || 'Mot de passe incorrect');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') doLogin();
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="TV Viewer" className="h-20 object-contain" />
          <p className="text-sm text-text-muted mt-2">Bienvenue, connectez-vous pour continuer</p>
        </div>
        {error && (
          <div className="bg-red/15 border border-red text-red px-4 py-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-1.5 font-medium text-text-muted text-sm">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Entrez le mot de passe"
            className="w-full px-3 py-2.5 bg-black/30 border border-border rounded-lg text-text text-[0.9rem] focus:outline-none focus:border-accent"
          />
        </div>
        <Button onClick={doLogin} disabled={loading} className="w-full justify-center">
          {loading ? <Spinner /> : 'Connexion'}
        </Button>
      </Card>
    </div>
  );
}
