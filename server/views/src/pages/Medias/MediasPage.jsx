import PageShell from '../../components/layout/PageShell';
import AlertContainer from '../../components/ui/Alert';
import MediaExplorer from './MediaExplorer';

export default function MediasPage() {
  return (
    <PageShell scroll={false} className="h-full flex flex-col max-md:h-auto">
      <AlertContainer />
      <h2 className="text-lg font-semibold text-text mb-4 shrink-0">Gestion des médias</h2>
      <div className="flex-1 min-h-0 max-md:min-h-[480px]">
        <MediaExplorer />
      </div>
    </PageShell>
  );
}
