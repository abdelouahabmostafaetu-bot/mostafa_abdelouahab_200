import { type NextRequest } from 'next/server';
import { proxyStackExchangeRequest } from '../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxyStackExchangeRequest(request, path.join('/'));
}
