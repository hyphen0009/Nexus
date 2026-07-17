import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="glass-panel auth-panel">
      <span className="eyebrow">Account</span>
      <h1>Recovery support</h1>
      <p>
        Password reset email delivery is intentionally not simulated. Contact the tournament admin through the verified
        Discord or WhatsApp channel for manual recovery.
      </p>
      <div className="hero-actions">
        <Link href="/login" className="btn-primary">
          Back to Login
        </Link>
        <Link href="/tournaments" className="btn-neon">
          Browse Games
        </Link>
      </div>
    </div>
  );
}
