import dns from 'node:dns';

const SYSTEM_DNS_SERVERS = dns.getServers();
const CUSTOM_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
const ENV_DNS_SERVERS = (process.env.MONGODB_DNS_SERVERS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const PREFERRED_DNS_SERVERS =
  ENV_DNS_SERVERS.length > 0 ? ENV_DNS_SERVERS : CUSTOM_DNS_SERVERS;

dns.setServers(PREFERRED_DNS_SERVERS);

import mongoose from 'mongoose';

function isSrvDnsLookupError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorCode = (error as NodeJS.ErrnoException).code;

  return (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    error.message.includes('querySrv')
  );
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not configured. Add it in your environment variables.');
  }

  return uri;
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cache;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const mongoUri = getMongoUri();

    cache.promise = mongoose
      .connect(mongoUri, {
        bufferCommands: false,
      })
      .catch(async (initialError) => {
        const shouldRetryWithSystemDns =
          isSrvDnsLookupError(initialError) && SYSTEM_DNS_SERVERS.length > 0;

        if (!shouldRetryWithSystemDns) {
          throw initialError;
        }

        console.warn(
          'MongoDB SRV lookup failed with preferred DNS servers. Retrying with system DNS settings.',
        );
        dns.setServers(SYSTEM_DNS_SERVERS);

        return mongoose.connect(mongoUri, {
          bufferCommands: false,
        });
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
