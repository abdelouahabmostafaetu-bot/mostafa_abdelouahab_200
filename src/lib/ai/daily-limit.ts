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

export type DailyLimitStatus = {
  /** A ready-to-return 429 response when the caller is over the limit, else null. */
  limited: NextResponse | null;
  /** How many messages remain today after counting this request. */
  remaining: number;
  /** The configured daily maximum. */
  limit: number;
};

export function checkDailyLimit(
  identity: string,
  scope: string,
  maxPerDay: number,
): DailyLimitStatus {
  const day = new Date().toISOString().slice(0, 10);
  const key = scope + ':' + identity + ':' + day;
  const bucket = dailyBuckets.get(key);

  let count: number;
  if (!bucket || bucket.day !== day) {
    dailyBuckets.set(key, { count: 1, day });
    count = 1;
  } else {
    bucket.count += 1;
    count = bucket.count;
  }

  if (count > maxPerDay) {
    return {
      limited: NextResponse.json(
        {
          error:
            'You have reached your daily limit of ' +
            maxPerDay +
            ' messages. Please come back tomorrow.',
        },
        {
          status: 429,
          headers: {
            'x-daily-remaining': '0',
            'x-daily-limit': String(maxPerDay),
          },
        },
      ),
      remaining: 0,
      limit: maxPerDay,
    };
  }

  return {
    limited: null,
    remaining: Math.max(0, maxPerDay - count),
    limit: maxPerDay,
  };
}
