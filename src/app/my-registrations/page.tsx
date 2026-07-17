import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserRegistrations } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function MyRegistrationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/my-registrations');
  }

  const registrations = await getUserRegistrations(user.id);
  const approved = registrations.filter((registration) => registration.status === 'Approved');
  const pending = registrations.filter((registration) => registration.status === 'Pending');

  return (
    <div className="page-shell">
      <section className="page-intro">
        <span className="eyebrow">Player dashboard</span>
        <h1>My registrations</h1>
        <p>Track submitted proofs, approved matches, payment history, and tournament history from one place.</p>
      </section>

      <section className="responsive-grid stats-grid">
        {[
          ['Registered tournaments', registrations.length],
          ['Approved matches', approved.length],
          ['Pending verification', pending.length],
        ].map(([label, value]) => (
          <article key={label} className="metric-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="glass-panel content-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">Payment history</span>
            <h2>Registration status</h2>
          </div>
          <Link href="/tournaments" className="btn-neon compact-button">
            Browse tournaments
          </Link>
        </div>

        <div className="dashboard-list">
          {registrations.map((registration) => (
            <article key={registration.id} className="dashboard-row">
              <div>
                <strong>{registration.tournamentName}</strong>
                <span>
                  {registration.teamName} - {registration.game} - {registration.entryFeeLabel}
                </span>
              </div>
              <div>
                <span className={`pill ${registration.status === 'Approved' ? 'pill-green' : registration.status === 'Rejected' ? 'pill-hot' : 'pill-amber'}`}>
                  {registration.status}
                </span>
                <small>{registration.submittedAtLabel}</small>
              </div>
              <Link href={`/tournaments/${registration.tournamentId}`} className="text-link">
                Details
              </Link>
            </article>
          ))}
        </div>

        {registrations.length === 0 && (
          <div className="empty-state compact-empty">
            <h2>No registrations yet.</h2>
            <p>Choose a tournament, pay the configured entry fee, and upload proof to create your first entry.</p>
          </div>
        )}
      </section>
    </div>
  );
}
