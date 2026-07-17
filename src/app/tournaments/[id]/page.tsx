import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getApprovedRegistrationsForTournament, getRegistrationForUser, getTournamentDetails } from '@/lib/data';
import RegistrationPanel from './RegistrationPanel';

export const dynamic = 'force-dynamic';

export default async function TournamentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, user] = await Promise.all([getTournamentDetails(id), getCurrentUser()]);

  if (!tournament) {
    notFound();
  }

  const [approvedRegistrations, existingRegistration] = await Promise.all([
    getApprovedRegistrationsForTournament(tournament.id),
    user ? getRegistrationForUser(tournament.id, user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="page-shell">
      <section className="detail-hero">
        <img src={tournament.bannerImage} alt="" />
        <div className="detail-hero-content">
          <div className="card-meta">
            <span className="pill pill-cyan">{tournament.game}</span>
            <span className="pill pill-hot">{tournament.status}</span>
            <span className="pill pill-amber">{tournament.matchType}</span>
          </div>
          <h1>{tournament.title}</h1>
          <p>{tournament.description}</p>
        </div>
      </section>

      <section className="two-col-layout detail-main-layout">
        <main>
          <div className="responsive-grid stats-grid">
            {[
              ['Prize pool', tournament.prizePool],
              ['Entry fee', tournament.entryFeeLabel],
              ['Tournament date', `${tournament.tournamentDateLabel}, ${tournament.startTime}`],
              ['Approved players', `${tournament.approvedCount}/${tournament.maxPlayers}`],
            ].map(([label, value]) => (
              <article key={label} className="metric-card">
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>

          <section className="glass-panel content-card match-briefing">
            <div className="section-header">
              <div>
                <span className="eyebrow">Match briefing</span>
                <h2>Rules and lobby details</h2>
              </div>
            </div>
            <div className="detail-grid">
              <div>
                <span>Platform</span>
                <strong>{tournament.platform}</strong>
              </div>
              <div>
                <span>Map</span>
                <strong>{tournament.map}</strong>
              </div>
              <div>
                <span>Registration deadline</span>
                <strong>{tournament.registrationDeadlineLabel}</strong>
              </div>
              <div>
                <span>Payment deadline</span>
                <strong>{tournament.paymentDeadlineLabel}</strong>
              </div>
            </div>
            <p>{tournament.rules}</p>
            <div className="hero-actions">
              {tournament.discordLink && (
                <Link href={tournament.discordLink} className="btn-neon" target="_blank">
                  Discord
                </Link>
              )}
              {tournament.whatsappLink && (
                <Link href={tournament.whatsappLink} className="btn-neon" target="_blank">
                  WhatsApp
                </Link>
              )}
            </div>
          </section>

          <section className="glass-panel content-card">
            <div className="section-header">
              <div>
                <span className="eyebrow">Verified squads</span>
                <h2>Approved players</h2>
              </div>
              <span className="pill pill-green">{approvedRegistrations.length} approved</span>
            </div>

            <div className="participant-list">
              {approvedRegistrations.map((registration) => (
                <article key={registration.id} className="participant-row">
                  <div>
                    <strong>{registration.teamName}</strong>
                    <span>
                      {registration.username}
                      {registration.teammates.length > 0
                        ? ` + ${registration.teammates.length} teammate${registration.teammates.length === 1 ? '' : 's'}`
                        : ''}
                    </span>
                  </div>
                  <span>{registration.registrationDateLabel}</span>
                </article>
              ))}
            </div>

            {approvedRegistrations.length === 0 && (
              <div className="empty-state compact-empty">
                <h3>No approved players yet.</h3>
                <p>Submitted entries appear here only after admin verification.</p>
              </div>
            )}
          </section>
        </main>

        <RegistrationPanel tournament={tournament} user={user} existingRegistration={existingRegistration} />
      </section>
    </div>
  );
}
