'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SessionUser } from '@/lib/auth';
import type { RegistrationView, TournamentDetails } from '@/lib/data';

type Props = {
  tournament: TournamentDetails;
  user: SessionUser | null;
  existingRegistration: RegistrationView | null;
};

type TeammateDraft = {
  name: string;
  gameName: string;
  uid: string;
};

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export default function RegistrationPanel({ tournament, user, existingRegistration }: Props) {
  const initialTeammates =
    existingRegistration?.teammates.length
      ? existingRegistration.teammates.map((teammate) => ({
          name: teammate.name,
          gameName: teammate.gameName,
          uid: teammate.uid,
        }))
      : [{ name: '', gameName: '', uid: '' }];

  const [teamName, setTeamName] = useState(existingRegistration?.teamName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [teammates, setTeammates] = useState<TeammateDraft[]>(initialTeammates);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canResubmit = existingRegistration?.status === 'Rejected';
  const lockedRegistration = existingRegistration && !canResubmit;

  const previewUrl = useMemo(() => (screenshot ? URL.createObjectURL(screenshot) : null), [screenshot]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const statusTone = useMemo(() => {
    if (!existingRegistration) {
      return 'pill-cyan';
    }

    if (existingRegistration.status === 'Approved') {
      return 'pill-green';
    }

    if (existingRegistration.status === 'Rejected') {
      return 'pill-hot';
    }

    return 'pill-amber';
  }, [existingRegistration]);

  const handleFileChange = (file: File | null) => {
    setError(null);
    setScreenshot(null);

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) {
      setError('Upload a JPG, JPEG, or PNG screenshot under 5 MB.');
      return;
    }

    setScreenshot(file);
  };

  const updateTeammate = (index: number, field: keyof TeammateDraft, value: string) => {
    setTeammates((current) =>
      current.map((teammate, teammateIndex) =>
        teammateIndex === index ? { ...teammate, [field]: value } : teammate
      )
    );
  };

  const addTeammate = () => {
    setTeammates((current) => [...current, { name: '', gameName: '', uid: '' }]);
  };

  const removeTeammate = (index: number) => {
    setTeammates((current) => current.filter((_, teammateIndex) => teammateIndex !== index));
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanedTeammates = teammates
      .map((teammate) => ({
        name: teammate.name.trim(),
        gameName: teammate.gameName.trim(),
        uid: teammate.uid.trim(),
      }))
      .filter((teammate) => teammate.name || teammate.gameName || teammate.uid);

    if (!teamName.trim()) {
      setError('Enter your team name before submitting.');
      return;
    }

    if (cleanedTeammates.some((teammate) => !teammate.name || !teammate.gameName || !teammate.uid)) {
      setError('Each teammate row needs a name, in-game name, and UID.');
      return;
    }

    if (!screenshot) {
      setError('Upload your payment screenshot before submitting.');
      return;
    }

    const formData = new FormData();
    formData.set('tournamentId', tournament.id);
    formData.set('teamName', teamName);
    formData.set('username', username);
    formData.set('fullName', fullName);
    formData.set('email', email);
    formData.set('phone', phone);
    formData.set('teammates', JSON.stringify(cleanedTeammates));
    formData.set('paymentScreenshot', screenshot);

    setSubmitting(true);
    const response = await fetch('/api/registrations', {
      method: 'POST',
      body: formData,
    });
    const payload = (await response.json()) as { error?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? 'Unable to submit registration.');
      return;
    }

    setSuccess('Registration submitted. Payment status is pending admin verification.');
    setScreenshot(null);
  };

  if (!user) {
    return (
      <aside className="glass-panel content-card payment-panel">
        <span className="eyebrow">Registration locked</span>
        <h2>Sign in to register</h2>
        <p>
          Create a player profile before payment so your registration details carry straight into admin review.
        </p>
        <div className="hero-actions">
          <Link href={`/login?next=/tournaments/${tournament.id}`} className="btn-primary">
            Login
          </Link>
          <Link href="/register" className="btn-neon">
            Register
          </Link>
        </div>
      </aside>
    );
  }

  if (lockedRegistration) {
    return (
      <aside className="glass-panel content-card payment-panel">
        <span className={`pill ${statusTone}`}>{existingRegistration.status}</span>
        <h2>Registration submitted</h2>
        <p>
          Your payment proof for {existingRegistration.tournamentName} was submitted on{' '}
          {existingRegistration.submittedAtLabel}.
        </p>
        <div className="detail-list">
          <span>Team: {existingRegistration.teamName}</span>
          <span>Payment status: {existingRegistration.paymentStatus}</span>
          <span>Entry fee: {existingRegistration.entryFeeLabel}</span>
          {existingRegistration.reviewedAtLabel && <span>Reviewed: {existingRegistration.reviewedAtLabel}</span>}
        </div>
        <Link href="/my-registrations" className="btn-primary full-width-button">
          Open My Registrations
        </Link>
      </aside>
    );
  }

  return (
    <aside className="glass-panel content-card payment-panel">
      <span className={`pill ${statusTone}`}>{canResubmit ? 'Rejected - resubmit proof' : 'Payment required'}</span>
      <h2>Register for {tournament.entryFeeLabel}</h2>
      <p>{tournament.paymentInstructions}</p>

      <div className="payment-box">
        <span>Payment deadline</span>
        <strong>{tournament.paymentDeadlineLabel}</strong>
        {tournament.upiId && <small>UPI: {tournament.upiId}</small>}
      </div>

      <a
        href={tournament.paymentUrl}
        className="btn-primary full-width-button"
        onClick={() => setPaymentStarted(true)}
        target="_blank"
        rel="noreferrer"
      >
        Pay Now
      </a>

      {paymentStarted && <div className="alert alert-success">Payment opened. Return here and upload the proof screenshot.</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={submitRegistration}>
        <label className="field-label">
          Team name
          <input className="input-field" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
        </label>
        <label className="field-label">
          Username
          <input className="input-field" value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="field-label">
          Full name
          <input className="input-field" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </label>
        <label className="field-label">
          Email
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field-label">
          Phone number
          <input className="input-field" value={phone} onChange={(event) => setPhone(event.target.value)} required />
        </label>

        <div className="subsection-block">
          <div className="section-header compact-section-header">
            <div>
              <span className="eyebrow">Squad</span>
              <h3>Teammates</h3>
            </div>
            <button type="button" className="btn-neon compact-button" onClick={addTeammate}>
              Add teammate
            </button>
          </div>

          <div className="member-list">
            {teammates.map((teammate, index) => (
              <div key={`${index}-${teammate.uid}`} className="member-row">
                <label className="field-label">
                  Name
                  <input
                    className="input-field"
                    value={teammate.name}
                    onChange={(event) => updateTeammate(index, 'name', event.target.value)}
                    placeholder="Player name"
                  />
                </label>
                <label className="field-label">
                  In-game name
                  <input
                    className="input-field"
                    value={teammate.gameName}
                    onChange={(event) => updateTeammate(index, 'gameName', event.target.value)}
                    placeholder="Game name"
                  />
                </label>
                <label className="field-label">
                  UID
                  <input
                    className="input-field"
                    value={teammate.uid}
                    onChange={(event) => updateTeammate(index, 'uid', event.target.value)}
                    placeholder="UID"
                  />
                </label>
                {teammates.length > 1 && (
                  <button type="button" className="btn-neon compact-button danger-button" onClick={() => removeTeammate(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <label className="upload-dropzone">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
          <span>{screenshot ? 'Replace screenshot' : 'Upload payment screenshot'}</span>
          <small>JPG, JPEG, or PNG under 5 MB</small>
        </label>

        {previewUrl && (
          <div className="proof-preview">
            <img src={previewUrl} alt="Payment screenshot preview" />
          </div>
        )}

        <button type="submit" className="btn-primary full-width-button" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Registration'}
        </button>
      </form>
    </aside>
  );
}
