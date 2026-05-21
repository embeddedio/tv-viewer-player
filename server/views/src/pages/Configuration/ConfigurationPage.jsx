import PageShell from '../../components/layout/PageShell';
import OrientationCard from './OrientationCard';
import LogoCard from './LogoCard';
import PasswordCard from './PasswordCard';
import TvScheduleCard from './TvScheduleCard';
import AlertContainer from '../../components/ui/Alert';

export default function ConfigurationPage() {
  return (
    <PageShell>
      <AlertContainer />
      <h2 className="mb-5 text-lg font-semibold">Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-5">
        <OrientationCard />
        <LogoCard />
        <PasswordCard />
        <TvScheduleCard />
      </div>
    </PageShell>
  );
}
