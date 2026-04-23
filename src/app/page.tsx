import ProfileSection from '@/components/home/ProfileSection';
import RecentActivity from '@/components/home/RecentActivity';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <ProfileSection />
      <RecentActivity />
    </>
  );
}
