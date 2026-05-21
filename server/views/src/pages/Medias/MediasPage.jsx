import PageShell from '../../components/layout/PageShell';
import Card from '../../components/ui/Card';
import AlertContainer from '../../components/ui/Alert';
import MediaTable from './MediaTable';

export default function MediasPage() {
  return (
    <PageShell>
      <AlertContainer />
      <h2 className="mb-5 text-lg font-semibold">Gestion des médias</h2>
      <Card className="p-0 overflow-hidden">
        <MediaTable />
      </Card>
    </PageShell>
  );
}
