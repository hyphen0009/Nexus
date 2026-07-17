'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { SessionUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nextPath] = useState(() => {
    if (typeof window === 'undefined') {
      return '/my-registrations';
    }

    const requested = new URLSearchParams(window.location.search).get('next');
    return requested?.startsWith('/') ? requested : '/my-registrations';
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json()) as { user?: SessionUser; error?: string };

    if (!response.ok || !payload.user) {
      setError(payload.error ?? 'Unable to sign in right now.');
      setLoading(false);
      return;
    }

    window.dispatchEvent(new Event('nexus-auth-change'));
    router.push(nextPath === '/my-registrations' && payload.user.role === 'ADMIN' ? '/admin' : nextPath);
    router.refresh();
  };

  return (
    <div className="glass-panel auth-panel">
      <span className="eyebrow">Account</span>
      <h1>Sign in</h1>
      <p>Track registrations, upload payment proof, and review updates from one place.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <label className="field-label">
          Email
          <input
            type="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="field-label">
          Password
          <input
            type="password"
            className="input-field"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p>
        New to Nexus? <Link href="/register" className="text-link">Create an account</Link>
      </p>
    </div>
  );
}
