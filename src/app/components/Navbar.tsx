'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/auth';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/tournaments', label: 'Tournaments' },
];

const userLinks = [
  { href: '/my-registrations', label: 'My Registrations' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        const payload = (await response.json()) as { user: SessionUser | null };
        setSessionUser(payload.user);
      } finally {
        setLoading(false);
      }
    };

    void syncSession();

    const handleAuthChange = () => {
      void syncSession();
    };

    window.addEventListener('nexcup-auth-change', handleAuthChange);
    return () => window.removeEventListener('nexcup-auth-change', handleAuthChange);
  }, []);

  const mobileLinks = sessionUser
    ? [
        { href: '/', label: 'Home' },
        { href: '/tournaments', label: 'Cups' },
        { href: '/my-registrations', label: 'Entries' },
        { href: '/profile', label: 'Profile' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/tournaments', label: 'Cups' },
        { href: '/login', label: 'Login' },
        { href: '/register', label: 'Join' },
      ];

  return (
    <>
      <nav className="navbar container">
        <div className="navbar-brand-row">
          <Link href="/" className="navbar-brand" aria-label="NexCup home">
            NexCup
          </Link>
          <span className="navbar-tag">Cup arena</span>
        </div>

        <div className="navbar-main">
          <div className="navbar-links">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="navbar-link"
                data-active={pathname === link.href.split('?')[0]}
              >
                {link.label}
              </Link>
            ))}

            {sessionUser &&
              userLinks.map((link) => (
                <Link key={link.href} href={link.href} className="navbar-link" data-active={pathname === link.href}>
                  {link.label}
                </Link>
              ))}

            {!loading && sessionUser?.role === 'ADMIN' && (
              <Link href="/admin" className="navbar-link" data-active={pathname === '/admin'}>
                Admin
              </Link>
            )}
          </div>

          <div className="navbar-actions">
            {!loading && sessionUser ? (
              <span className="session-chip">{sessionUser.username}</span>
            ) : (
              !loading && (
                <>
                  <Link href="/login" className="btn-neon compact-button">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary compact-button">
                    Register
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      <div className="mobile-topbar">
        <Link href="/" className="mobile-brand" aria-label="NexCup home">
          NexCup
        </Link>
        <div className="mobile-topbar-meta">
          <span>Cup arena</span>
          {!loading && sessionUser && <strong>{sessionUser.username}</strong>}
        </div>
      </div>

      {!loading && (
        <nav className="mobile-nav" aria-label="Primary">
          {mobileLinks.map((link) => (
            <Link key={link.href} href={link.href} className="mobile-nav-link" data-active={pathname === link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
