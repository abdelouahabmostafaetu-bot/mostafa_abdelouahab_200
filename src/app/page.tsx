import ProfileSection from '@/components/home/ProfileSection';
import RecentActivity from '@/components/home/RecentActivity';
import Reveal from '@/components/visual/Reveal';
import ScrollProgress from '@/components/visual/ScrollProgress';
import SectionDivider from '@/components/visual/SectionDivider';
import WhisperSymbols from '@/components/home/WhisperSymbols';

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

      {/* Publications section with a sparse whisper symbol field behind its
          top band (home only). The field is clipped to a short top region so
          it sits behind the heading, never over the card text. Content is
          rendered above via relative z-10. */}
      <Reveal direction="up">
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden">
            <WhisperSymbols />
          </div>
          <div className="relative z-10">
            <RecentActivity />
          </div>
        </div>
      </Reveal>
    </>
  );
}
