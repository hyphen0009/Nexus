'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.dispatchEvent(new Event('nexus-auth-change'));
    router.push('/');
    router.refresh();
  };

  return (
    <button type="button" className="btn-neon compact-button logout-button" onClick={handleLogout}>
      Logout
    </button>
  );
}
