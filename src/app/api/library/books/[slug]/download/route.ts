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

function buildDownloadRedirect(request: NextRequest, fileUrl: string, fileName: string) {
  let sourceUrl: URL;

  try {
    sourceUrl = new URL(fileUrl, request.url);
  } catch {
    return NextResponse.json({ error: 'Download file URL is invalid.' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    return NextResponse.json({ error: 'Download file URL is invalid.' }, { status: 400 });
  }

  /*
    Public Vercel Blob URLs can be opened by anyone who has the raw URL.
    This route protects normal UI access by checking sign-in before revealing
    the URL. Strict secrecy requires private storage or a streaming proxy.
  */
  const response = NextResponse.redirect(sourceUrl, { status: 302 });
  response.headers.set('Content-Disposition', `attachment; filename="${sanitizeDownloadFileName(fileName)}"`);
  return response;
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

    return buildDownloadRedirect(request, fileUrl, book?.fileName || 'book.pdf');
  } catch (error) {
    console.error('GET /api/library/books/[slug]/download failed:', error);
    return NextResponse.json({ error: 'Failed to download book.' }, { status: 500 });
  }
}
