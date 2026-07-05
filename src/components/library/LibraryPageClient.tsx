'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';
import type { LibraryBook } from '@/types/library';

const PAGE_SIZE = 12;

type BooksPayload = {
  books: LibraryBook[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type SortOption = 'newest' | 'title' | 'author';

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseBooksPayload(payload: unknown): BooksPayload {
  if (Array.isArray(payload)) {
    return {
      books: payload.filter(Boolean) as LibraryBook[],
      pagination: {
        page: 1,
        pageSize: payload.length,
        total: payload.length,
        totalPages: 1,
      },
    };
  }

  if (payload && typeof payload === 'object') {
    const value = payload as Partial<BooksPayload>;
    return {
      books: Array.isArray(value.books) ? value.books.filter(Boolean) : [],
      pagination: value.pagination,
    };
  }

  return { books: [] };
}

function getBookDownloadUrl(book: LibraryBook): string {
  return book.pdfUrl || book.fileUrl || book.pdf_url || book.downloadUrl || '';
}

function getBookCoverUrl(book: LibraryBook): string {
  return book.coverUrl || book.imageUrl || book.cover_url || book.thumbnailUrl || book.cover || '';
}

function getBookCategory(book: LibraryBook): string {
  return (book.category || '').trim() || 'General';
}

function getBookTimestamp(book: LibraryBook): number {
  const raw = book.addedAt || book.createdAt || book.updatedAt || '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function BookCard({ book, isSignedIn }: { book: LibraryBook; isSignedIn?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = Boolean(book.description && book.description.length > 110);
  const downloadUrl = getBookDownloadUrl(book);
  const coverUrl = getBookCoverUrl(book);
  const category = getBookCategory(book);

  return (
    <article className="group