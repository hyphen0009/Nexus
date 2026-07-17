import Link from 'next/link';
import { getFeaturedTournaments, getRecentApprovedTeams } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [featuredTournaments, recentTeams] = await Promise.all([getFeaturedTournaments(), getRecentApprovedTeams()]);

  return (
    <div className="page-shell">
      <section className="hero-stage">
        <div className="hero-stage-content">
          <div className="hero-kicker">
            <span className="eyebrow">Tournament platform</span>
            <span className="session-chip">Squad mode</span>
          </div>
          <h1>Registered teams</h1>
          <div className="hero-actions">
            <Link href="/tournaments" className="btn-primary">
              Browse Tournaments
            </Link>
            <Link href="/my-registrations" className="btn-neon">
              My Registrations
            </Link>
          </div>
          <div className="team-board">
            <div className="team-board-header">
              <span className="team-board-label">Approved squads</span>
              <span className="team-board-count">{recentTeams.length}</span>
            </div>
            <div className="team-board-list">
              {recentTeams.length > 0 ? (
                recentTeams.map((team) => (
                  <div key={team.id} className="team-board-row">
                    <strong>{team.teamName}</strong>
                    <span>{team.tournamentName}</span>
                  </div>
                ))
              ) : (
                <div className="team-board-empty">No approved squads yet</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <div>
            <span className="eyebrow">Featured tournaments</span>
            <h2>Open for registration</h2>
          </div>
          <Link href="/tournaments" className="text-link">
            View all tournaments
          </Link>
        </div>

        <div className="responsive-grid card-grid">
          {featuredTournaments.map((tournament) => (
            <article key={tournament.id} className="tournament-card">
              <img src={tournament.bannerImage} alt="" className="card-banner" />
              <div className="content-card card-body">
                <div className="card-meta">
                  <span className="pill pill-cyan">{tournament.game}</span>
                  <span className="pill pill-hot">{tournament.status}</span>
                </div>
                <h3>{tournament.title}</h3>
                <p>{tournament.description}</p>
                <div className="card-stats">
                  <span>{tournament.prizePool}</span>
                  <span>{tournament.entryFeeLabel}</span>
                  <span>{tournament.tournamentDateLabel}</span>
                </div>
                <Link href={`/tournaments/${tournament.id}`} className="btn-primary full-width-button">
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
