import PageShell from '../../components/layout/PageShell';
import Card from '../../components/ui/Card';
import AlertContainer from '../../components/ui/Alert';
import WidgetsTable from './WidgetsTable';

export default function WidgetsPage() {
  return (
    <PageShell>
      <AlertContainer />
      <h2 className="mb-5 text-lg font-semibold">Gestion des widgets</h2>
      <Card className="p-0 overflow-hidden">
        <WidgetsTable />
      </Card>
    </PageShell>
  );
}
