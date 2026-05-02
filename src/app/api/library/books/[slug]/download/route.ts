import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { type NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BookModel from '@/lib/models/book';

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeDownloadFileName(value: string): string {
  return value.replace(/[\r\n"\\]/g, '_').trim() || 'book.pdf';
}

async function buildDownloadResponse(request: NextRequest, fileUrl: string, fileName: string) {
  const sourceUrl = new URL(fileUrl, request.url);
  const sourceResponse = await fetch(sourceUrl);

  if (!sourceResponse.ok || !sourceResponse.body) {
    throw new Error('Unable to fetch the file for download.');
  }

  const safeName = sanitizeDownloadFileName(fileName);
  const headers = new Headers();
  headers.set('Content-Type', sourceResponse.headers.get('content-type') || 'application/octet-stream');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  );

  const contentLength = sourceResponse.headers.get('content-length');
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  return new NextResponse(sourceResponse.body, {
    status: 200,
    headers,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await currentUser();
  if (!user) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl, { status: 302 });
  }

  try {
    await connectToDatabase();

    const { slug } = await context.params;
    const query: Record<string, unknown>[] = [{ slug }];

    if (mongoose.Types.ObjectId.isValid(slug)) {
      query.push({ _id: slug });
    }

    const book = await BookModel.findOne({ $or: query });
    const fileUrl = book?.fileUrl || book?.filePath || '';

    if (!fileUrl) {
      return NextResponse.json({ error: 'Download file not found.' }, { status: 404 });
    }

    return buildDownloadResponse(request, fileUrl, book?.fileName || 'book.pdf');
  } catch (error) {
    console.error('GET /api/library/books/[slug]/download failed:', error);
    return NextResponse.json({ error: 'Failed to download book.' }, { status: 500 });
  }
}
