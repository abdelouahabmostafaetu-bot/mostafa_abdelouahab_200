import ProfileSection from '@/components/home/ProfileSection';
import RecentActivity from '@/components/home/RecentActivity';
import Reveal from '@/components/visual/Reveal';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <ProfileSection />

      <div className="mx-auto max-w-wide px-4 sm:px-6">
        <hr className="rule-glow" />
      </div>

      <Reveal>
        <RecentActivity />
      </Reveal>
    </>
  );
}
