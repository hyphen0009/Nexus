'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminTournamentView, RegistrationView } from '@/lib/data';

type Props = {
  initialRegistrations: RegistrationView[];
  initialTournaments: AdminTournamentView[];
  stats: {
    tournamentCount: number;
    approvedRegistrations: number;
    pendingRegistrations: number;
    playerCount: number;
  };
};

type TournamentDraft = {
  title: string;
  description: string;
  game: string;
  matchType: string;
  prizePool: string;
  entryFee: string;
  registrationDeadline: string;
  tournamentDate: string;
  startTime: string;
  maxPlayers: string;
  rules: string;
  map: string;
  platform: string;
  discordLink: string;
  whatsappLink: string;
  paymentUrl: string;
  upiId: string;
  qrCodeImage: string;
  paymentInstructions: string;
  bannerImage: string;
  status: string;
};

const emptyDraft: TournamentDraft = {
  title: '',
  description: '',
  game: '',
  matchType: '',
  prizePool: '',
  entryFee: '49',
  registrationDeadline: '',
  tournamentDate: '',
  startTime: '8:00 PM IST',
  maxPlayers: '64',
  rules: '',
  map: '',
  platform: 'Mobile',
  discordLink: '',
  whatsappLink: '',
  paymentUrl: '',
  upiId: '',
  qrCodeImage: '',
  paymentInstructions: '',
  bannerImage: '/assets/esports-arena-banner.png',
  status: 'UPCOMING',
};

function toDateInput(value: string) {
  return value.slice(0, 10);
}

function draftFromTournament(tournament: AdminTournamentView): TournamentDraft {
  return {
    title: tournament.title,
    description: tournament.description,
    game: tournament.game,
    matchType: tournament.matchType,
    prizePool: tournament.prizePool,
    entryFee: String(tournament.entryFee),
    registrationDeadline: toDateInput(tournament.registrationDeadline),
    tournamentDate: toDateInput(tournament.tournamentDate),
    startTime: tournament.startTime,
    maxPlayers: String(tournament.maxPlayers),
    rules: tournament.rules,
    map: tournament.map,
    platform: tournament.platform,
    discordLink: tournament.discordLink ?? '',
    whatsappLink: tournament.whatsappLink ?? '',
    paymentUrl: tournament.paymentUrl,
    upiId: tournament.upiId ?? '',
    qrCodeImage: tournament.qrCodeImage ?? '',
    paymentInstructions: tournament.paymentInstructions,
    bannerImage: tournament.bannerImage,
    status: tournament.status.toUpperCase(),
  };
}

export default function AdminDashboardClient({ initialRegistrations, initialTournaments, stats }: Props) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [tournaments, setTournaments] = useState(initialTournaments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tournamentFilter, setTournamentFilter] = useState('All');
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest');
  const [draft, setDraft] = useState<TournamentDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredRegistrations = useMemo(() => {
    return registrations
      .filter((registration) => {
        const teammateHaystack = registration.teammates
          .map((teammate) => `${teammate.name} ${teammate.gameName} ${teammate.uid}`)
          .join(' ');
        const haystack =
          `${registration.teamName} ${registration.fullName} ${registration.username} ${registration.email} ${registration.phone} ${registration.tournamentName} ${teammateHaystack}`.toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || registration.status === statusFilter;
        const matchesTournament = tournamentFilter === 'All' || registration.tournamentName === tournamentFilter;
        return matchesSearch && matchesStatus && matchesTournament;
      })
      .sort((a, b) =>
        sortDirection === 'newest'
          ? Date.parse(b.submittedAt) - Date.parse(a.submittedAt)
          : Date.parse(a.submittedAt) - Date.parse(b.submittedAt)
      );
  }, [registrations, search, statusFilter, tournamentFilter, sortDirection]);

  const tournamentNames = ['All', ...Array.from(new Set(registrations.map((registration) => registration.tournamentName)))];

  const setDraftValue = (field: keyof TournamentDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const reviewRegistration = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setError(null);
    const reviewerNote = status === 'REJECTED' ? window.prompt('Reason for rejection?') ?? '' : '';
    const response = await fetch(`/api/admin/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewerNote }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? 'Unable to update registration.');
      return;
    }

    setRegistrations((current) =>
      current.map((registration) =>
        registration.id === id
          ? {
              ...registration,
              status: status === 'APPROVED' ? 'Approved' : 'Rejected',
              paymentStatus: status === 'APPROVED' ? 'Approved' : 'Rejected',
              reviewerNote: reviewerNote || registration.reviewerNote,
            }
          : registration
      )
    );
    setMessage(`Registration ${status.toLowerCase()}.`);
    router.refresh();
  };

  const submitTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const endpoint = editingId ? `/api/admin/tournaments/${editingId}` : '/api/admin/tournaments';
    const response = await fetch(endpoint, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? 'Unable to save tournament.');
      return;
    }

    setMessage(editingId ? 'Tournament updated.' : 'Tournament created.');
    setEditingId(null);
    setDraft(emptyDraft);
    router.refresh();
  };

  const runTournamentAction = async (id: string, action: string) => {
    setError(null);
    const response = await fetch(`/api/admin/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? 'Unable to update tournament.');
      return;
    }

    setMessage(`Tournament action completed: ${action}.`);
    router.refresh();
  };

  const deleteTournament = async (id: string) => {
    if (!window.confirm('Delete this tournament and its registrations?')) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/admin/tournaments/${id}`, { method: 'DELETE' });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? 'Unable to delete tournament.');
      return;
    }

    setTournaments((current) => current.filter((tournament) => tournament.id !== id));
    setMessage('Tournament deleted.');
    router.refresh();
  };

  return (
    <div className="page-shell">
      <section className="page-intro">
        <span className="eyebrow">Admin console</span>
        <h1>Verification dashboard</h1>
        <p>Review payment screenshots, approve registrations, and manage tournament payment configuration.</p>
      </section>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="responsive-grid stats-grid">
        {[
          ['Published tournaments', stats.tournamentCount],
          ['Approved entries', stats.approvedRegistrations],
          ['Pending reviews', stats.pendingRegistrations],
          ['Players', stats.playerCount],
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
            <span className="eyebrow">Payment verification</span>
            <h2>Pending and reviewed registrations</h2>
          </div>
          <span className="pill pill-amber">{filteredRegistrations.length} visible</span>
        </div>

        <div className="filter-bar admin-filter-bar">
          <input
            className="input-field"
            type="search"
            placeholder="Search player, email, phone, tournament"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="input-field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {['All', 'Pending', 'Approved', 'Rejected'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={tournamentFilter}
            onChange={(event) => setTournamentFilter(event.target.value)}
          >
            {tournamentNames.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as 'newest' | 'oldest')}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <div className="admin-registration-list">
          {filteredRegistrations.map((registration) => (
            <article key={registration.id} className="admin-registration-card">
              <a href={registration.paymentScreenshot} target="_blank" rel="noreferrer" className="proof-thumb">
                <img src={registration.paymentScreenshot} alt={`${registration.username} payment proof`} />
              </a>
              <div>
                <div className="card-meta">
                  <span className={`pill ${registration.status === 'Approved' ? 'pill-green' : registration.status === 'Rejected' ? 'pill-hot' : 'pill-amber'}`}>
                    {registration.status}
                  </span>
                  <span className="pill pill-cyan">{registration.entryFeeLabel}</span>
                </div>
                <h3>{registration.teamName}</h3>
                <p>
                  {registration.username} - {registration.email} - {registration.phone}
                </p>
                <p>
                  {registration.tournamentName} - {registration.game} - Submitted {registration.submittedAtLabel}
                </p>
                {registration.teammates.length > 0 && (
                  <p>
                    Squad: {registration.teammates.map((teammate) => `${teammate.name} (${teammate.gameName} / ${teammate.uid})`).join(', ')}
                  </p>
                )}
              </div>
              <div className="admin-actions">
                <button
                  type="button"
                  className="btn-primary compact-button"
                  onClick={() => reviewRegistration(registration.id, 'APPROVED')}
                  disabled={registration.status === 'Approved'}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn-neon compact-button danger-button"
                  onClick={() => reviewRegistration(registration.id, 'REJECTED')}
                  disabled={registration.status === 'Rejected'}
                >
                  Reject
                </button>
                <a href={registration.paymentScreenshot} download className="text-link">
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>

        {filteredRegistrations.length === 0 && (
          <div className="empty-state compact-empty">
            <h3>No registrations found.</h3>
            <p>New payment-proof submissions will appear here for review.</p>
          </div>
        )}
      </section>

      <section className="two-col-layout admin-management-layout">
        <form className="glass-panel content-card admin-form" onSubmit={submitTournament}>
          <span className="eyebrow">{editingId ? 'Edit tournament' : 'Add tournament'}</span>
          <h2>{editingId ? 'Update tournament' : 'Create tournament'}</h2>
          <div className="form-grid">
            {[
              ['title', 'Tournament name'],
              ['game', 'Game'],
              ['matchType', 'Match type'],
              ['prizePool', 'Prize pool'],
              ['entryFee', 'Entry fee'],
              ['registrationDeadline', 'Registration deadline'],
              ['tournamentDate', 'Tournament date'],
              ['startTime', 'Start time'],
              ['maxPlayers', 'Maximum players'],
              ['map', 'Map'],
              ['platform', 'Platform'],
              ['paymentUrl', 'Payment URL'],
              ['upiId', 'UPI ID'],
              ['discordLink', 'Discord link'],
              ['whatsappLink', 'WhatsApp link'],
              ['bannerImage', 'Banner image'],
            ].map(([field, label]) => (
              <label key={field} className="field-label">
                {label}
                <input
                  className="input-field"
                  type={field.includes('Date') || field.includes('Deadline') ? 'date' : field === 'entryFee' || field === 'maxPlayers' ? 'number' : 'text'}
                  value={draft[field as keyof TournamentDraft]}
                  onChange={(event) => setDraftValue(field as keyof TournamentDraft, event.target.value)}
                  required={['title', 'game', 'entryFee', 'paymentUrl'].includes(field)}
                />
              </label>
            ))}
          </div>

          <label className="field-label">
            Description
            <textarea
              className="input-field"
              rows={3}
              value={draft.description}
              onChange={(event) => setDraftValue('description', event.target.value)}
            />
          </label>
          <label className="field-label">
            Rules
            <textarea
              className="input-field"
              rows={3}
              value={draft.rules}
              onChange={(event) => setDraftValue('rules', event.target.value)}
            />
          </label>
          <label className="field-label">
            Payment instructions
            <textarea
              className="input-field"
              rows={3}
              value={draft.paymentInstructions}
              onChange={(event) => setDraftValue('paymentInstructions', event.target.value)}
            />
          </label>
          <div className="hero-actions">
            <button type="submit" className="btn-primary">
              {editingId ? 'Save Changes' : 'Add Tournament'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-neon"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="glass-panel content-card">
          <span className="eyebrow">Tournament management</span>
          <h2>Publish, duplicate, archive</h2>
          <div className="tournament-admin-list">
            {tournaments.map((tournament) => (
              <article key={tournament.id} className="tournament-admin-row">
                <div>
                  <h3>{tournament.title}</h3>
                  <p>
                    {tournament.game} - {tournament.entryFeeLabel} - {tournament.approvedCount}/{tournament.maxPlayers}{' '}
                    approved
                  </p>
                  <div className="card-meta">
                    <span className={`pill ${tournament.isPublished ? 'pill-green' : 'pill-amber'}`}>
                      {tournament.isPublished ? 'Published' : 'Unpublished'}
                    </span>
                    {tournament.isArchived && <span className="pill pill-hot">Archived</span>}
                  </div>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="btn-neon compact-button"
                    onClick={() => {
                      setEditingId(tournament.id);
                      setDraft(draftFromTournament(tournament));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-neon compact-button"
                    onClick={() => runTournamentAction(tournament.id, tournament.isPublished ? 'unpublish' : 'publish')}
                  >
                    {tournament.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="btn-neon compact-button"
                    onClick={() => runTournamentAction(tournament.id, 'duplicate')}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn-neon compact-button"
                    onClick={() => runTournamentAction(tournament.id, tournament.isArchived ? 'restore' : 'archive')}
                  >
                    {tournament.isArchived ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    type="button"
                    className="btn-neon compact-button danger-button"
                    onClick={() => deleteTournament(tournament.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
