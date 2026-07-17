import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-center">
      <div className="glass-panel not-found-card">
        <span className="eyebrow">Page unavailable</span>
        <h1>We couldn&apos;t find that page</h1>
        <p>
          The page may have moved or the link may be outdated. Use the home page to get back on track.
        </p>
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  );
}
