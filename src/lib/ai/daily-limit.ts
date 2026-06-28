/**
 * Simple per-user daily message limit.
 * Counts how many messages each signed-in user (or IP) sends per calendar day
 * and blocks them with a friendly message once they pass the limit.
 *
 * Note: this counter lives in server memory, so on serverless hosting it is a
 * soft limit (it can reset when a new server instance starts). For a strict,
 * permanent limit we would store the count in the database — ask to upgrade
 * this later if you need it enforced exactly.
 */

import { NextResponse } from 'next/server';

type DailyBucket = { count: number; day: string };

const dailyBuckets = new Map<string, DailyBucket>();

export function checkDailyLimit(
  identity: string,
  scope: string,
  maxPerDay: number,
): NextResponse | null {
  const day = new Date().toISOString().slice(0, 10);
  const key = scope + ':' + identity + ':' + day;
  const bucket = dailyBuckets.get(key);

  if (!bucket || bucket.day !== day) {
    dailyBuckets.set(key, { count: 1, day });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= maxPerDay) {
    return null;
  }

  return NextResponse.json(
    {
      error:
        'You have reached your daily limit of ' +
        maxPerDay +
        ' messages. Please come back tomorrow.',
    },
    { status: 429 },
  );
}
