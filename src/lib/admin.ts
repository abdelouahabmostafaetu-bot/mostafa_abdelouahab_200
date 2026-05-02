import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;

function getConfiguredAdminEmail() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL environment variable is not configured.');
  }

  return adminEmail;
}

function getPrimaryEmail(user: NonNullable<ClerkUser>) {
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
}

function isAdminUser(user: ClerkUser) {
  if (!user) {
    return false;
  }

  return getPrimaryEmail(user) === getConfiguredAdminEmail();
}

export async function getCurrentAdminUser() {
  const user = await currentUser();
  return isAdminUser(user) ? user : null;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdminUser(user)) {
    redirect('/');
  }

  return user;
}
