'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Newspaper,
  NotebookPen,
  GraduationCap,
  Library,
  type LucideIcon,
} from 'lucide-react';

type Tab = { href: string; label: string; Icon: LucideIcon };

const tabs: Tab[] = [
  { href: '/', label: 'About', Icon: Home },
  { href: '/blog', label: 'Blog', Icon: Newspaper },
  { href: '/notes', label: 'Notes', Icon: NotebookPen },
  { href: '/doctorate-exams', label: 'Doctorate', Icon: GraduationCap },
  { href: '/library', label: 'Library', Icon: Library },
];

/**
 * MobileTabBar — one-thumb bottom navigation for phones only (md:hidden).
 * Fixed above the safe-area inset; the app shell reserves matching space via
 * `.pb-mobile-chrome` so it never overlaps content. Problems stays reachable
 * from the full navbar / hamburger menu.
 */
export default function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md safe-bottom md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="press flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.62rem] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-[var(--radius-full)] transition-colors duration-150 ${
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--text-subtle)]'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className={active ? 'text-[var(--accent)]' : 'text-[var(--text-subtle)]'}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
