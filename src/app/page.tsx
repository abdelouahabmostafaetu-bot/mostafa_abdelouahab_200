import ProfileSection from '@/components/home/ProfileSection';
import RecentActivity from '@/components/home/RecentActivity';
import Reveal from '@/components/visual/Reveal';
import ScrollProgress from '@/components/visual/ScrollProgress';
import SectionDivider from '@/components/visual/SectionDivider';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      {/* Thin gold scroll-progress bar (home only) */}
      <ScrollProgress />

      <ProfileSection />

      <div className="mx-auto max-w-wide px-4 sm:px-6">
        <SectionDivider />
      </div>

      <Reveal direction="up">
        <RecentActivity />
      </Reveal>
    </>
  );
}
