import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserNotifications } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/notifications');
  }

  const notifications = await getUserNotifications(user.id);

  return (
    <div className="page-shell">
      <section className="page-intro">
        <span className="eyebrow">Alerts</span>
        <h1>My notifications</h1>
        <p>Registration updates, approval decisions, tournament changes, and match reminders appear here.</p>
      </section>

      <section className="glass-panel content-card">
        <div className="dashboard-list">
          {notifications.map((notification) => (
            <article key={notification.id} className="dashboard-row">
              <div>
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
              </div>
              <div>
                <span className={`pill ${notification.isRead ? 'pill-cyan' : 'pill-amber'}`}>
                  {notification.isRead ? 'Read' : 'New'}
                </span>
                <small>{notification.createdAtLabel}</small>
              </div>
            </article>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="empty-state compact-empty">
            <h2>No notifications yet.</h2>
            <p>Registration and tournament updates will appear after you start competing.</p>
            <Link href="/tournaments" className="btn-primary">
              Browse tournaments
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
