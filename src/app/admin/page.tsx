import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAdminSnapshot } from '@/lib/data';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  if (user.role !== 'ADMIN') {
    notFound();
  }

  const snapshot = await getAdminSnapshot();

  return (
    <AdminDashboardClient
      initialRegistrations={snapshot.registrations}
      initialTournaments={snapshot.tournaments}
      stats={snapshot.stats}
    />
  );
}
