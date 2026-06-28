import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentAdminUser } from '@/lib/admin';
import AdminAIChat from '@/components/admin-ai/AdminAIChat';

export const metadata: Metadata = {
  title: 'Admin AI',
  description: 'Admin-only AI assistant to manage the website.',
};

const headingStyle = { fontFamily: 'var(--font-heading)' };

export default async function AdminAIPage() {
  const admin = await getCurrentAdminUser();

  if (!admin) {
    return (
      <div className="pt-20 pb-20">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h1
            className="text-2xl md:text-3xl font-semibold text-[var(--color-text)] mb-3"
            style={headingStyle}
          >
            Admin access required
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-6">
            This assistant is available to the site administrator only.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <header className="mb-6">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-2">
            Admin Only
          </p>
          <h1
            className="text-2xl md:text-4xl font-semibold text-[var(--color-text)] mb-3"
            style={headingStyle}
          >
            Admin AI
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-6 max-w-2xl">
            Manage your website by chatting. Ask it to draft, edit, publish, unpublish, or delete
            blog posts — it performs the actions for you and confirms what changed.
          </p>
        </header>

        <AdminAIChat />
      </div>
    </div>
  );
}
