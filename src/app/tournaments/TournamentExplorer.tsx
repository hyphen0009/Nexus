'use client';

import Link from 'next/link';
import type { TournamentCard } from '@/lib/data';

type Props = {
  tournaments: TournamentCard[];
};

export default function TournamentExplorer({ tournaments }: Props) {
  return (
    <div className="responsive-grid card-grid">
      {tournaments.map((tournament) => (
        <article key={tournament.id} className="tournament-card">
          <img src={tournament.bannerImage} alt="" className="card-banner" />
          <div className="content-card card-body">
            <div className="card-meta">
              <span className="pill pill-cyan">{tournament.game}</span>
              <span className="pill pill-hot">{tournament.status}</span>
            </div>
            <h2>{tournament.title}</h2>
            <p>{tournament.description}</p>
            <div className="card-stats">
              <span>{tournament.matchType}</span>
              <span>{tournament.prizePool}</span>
              <span>{tournament.entryFeeLabel}</span>
            </div>
            <div className="card-stats">
              <span>{tournament.tournamentDateLabel}</span>
              <span>
                {tournament.approvedCount}/{tournament.maxPlayers} approved
              </span>
            </div>
            <Link href={`/tournaments/${tournament.id}`} className="btn-primary full-width-button">
              View Details
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
