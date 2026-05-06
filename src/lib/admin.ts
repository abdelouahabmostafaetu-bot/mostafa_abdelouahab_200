import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

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
  try {
    return isAdminUser(user) ? user : null;
  } catch (error) {
    console.error('Admin authorization is not configured:', error);
    return null;
  }
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  try {
    if (isAdminUser(user)) {
      return user;
    }
  } catch (error) {
    console.error('Admin authorization is not configured:', error);
  }

  redirect('/');
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    if (isAdminUser(user)) {
      return null;
    }
  } catch (error) {
    console.error('Admin authorization is not configured:', error);
  }

  return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
}
