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

    /*
      Vercel Blob public URLs can be opened by anyone who has the raw URL.
      This route protects normal UI downloads by keeping that URL out of public
      book listings; strict file secrecy requires private Blob storage or a
      proxy/streaming strategy that never reveals the storage URL.
    */
    return NextResponse.redirect(new URL(fileUrl, request.url), { status: 302 });
  } catch (error) {
    console.error('GET /api/library/books/[slug]/download failed:', error);
    return NextResponse.json({ error: 'Failed to download book.' }, { status: 500 });
  }
}
