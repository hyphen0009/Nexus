import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserRegistrations } from '@/lib/data';
import LogoutButton from '../components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const registrations = await getUserRegistrations(user.id);

  return (
    <div className="page-shell">
      <section className="glass-panel content-card profile-card">
        <span className="eyebrow">My profile</span>
        <h1>{user.fullName}</h1>
        <div className="detail-grid">
          <div>
            <span>Username</span>
            <strong>{user.username}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{user.phone ?? 'Not set'}</strong>
          </div>
          <div>
            <span>User ID</span>
            <strong>{user.id}</strong>
          </div>
        </div>
      </section>

      <section className="responsive-grid stats-grid">
        {[
          ['Tournament history', registrations.length],
          ['Approved matches', registrations.filter((registration) => registration.status === 'Approved').length],
          ['Wins', 0],
          ['Earnings', 'Rs. 0'],
        ].map(([label, value]) => (
          <article key={label} className="metric-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <div className="hero-actions">
        <Link href="/my-registrations" className="btn-primary">
          My Registrations
        </Link>
        <Link href="/notifications" className="btn-neon">
          Notifications
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
