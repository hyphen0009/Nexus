import { getPublishedTournaments } from '@/lib/data';
import TournamentExplorer from './TournamentExplorer';

export const dynamic = 'force-dynamic';

export default async function TournamentsPage() {
  const tournaments = await getPublishedTournaments();

  return (
    <div className="page-shell">
      <section className="page-intro">
        <span className="eyebrow">Tournament finder</span>
        <h1>Browse tournaments</h1>
        <p>
          Filter by game, format, price, and status. Registration only reaches admins after payment proof is
          submitted.
        </p>
      </section>

      <TournamentExplorer tournaments={tournaments} />
    </div>
  );
}
