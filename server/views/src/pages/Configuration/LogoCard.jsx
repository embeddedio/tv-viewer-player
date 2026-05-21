import { useRef } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { api, uploadFiles, uploadsUrl } from '../../api';
import { showAlert } from '../../components/ui/Alert';

export default function LogoCard() {
  const { logoInfo, reloadLogo } = useApp();
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await uploadFiles([file], { category: 'logo', label: 'Logo' });
    if (r?.success) {
      showAlert('Logo mis a jour');
      await reloadLogo();
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer le logo ?')) return;
    await api('/logo/delete', { method: 'POST' });
    showAlert('Logo supprime');
    await reloadLogo();
  };

  return (
    <Card title="Logo">
      {logoInfo ? (
        <img src={uploadsUrl(logoInfo.name)} className="max-w-[200px] max-h-[120px] rounded-lg mb-3" />
      ) : (
        <p className="text-text-dim mb-3">Aucun logo configure</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" sm onClick={() => inputRef.current?.click()}>
          Changer le logo
        </Button>
        {logoInfo && (
          <Button variant="danger" sm onClick={handleDelete}>
            Supprimer
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </Card>
  );
}
