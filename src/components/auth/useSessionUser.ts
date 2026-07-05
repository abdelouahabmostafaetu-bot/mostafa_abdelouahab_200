'use client';

import { useEffect, useState } from 'react';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string;
  isAdmin?: boolean;
};

/**
 * useSessionUser — client hook returning the signed-in user (or null)
 * from the custom Google OAuth + MongoDB session system.
 * API-compatible with the old Clerk useUser(): { user, isLoaded }.
 */
export function useSessionUser(): {
  user: SessionUser | null;
  isLoaded: boolean;
} {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { user?: SessionUser | null }) => {
        if (!cancelled) setUser(d?.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isLoaded };
}
