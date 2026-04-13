import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Download,
  BookOpen,
  Moon,
  Sun,
  Plus,
  X,
  BookMarked,
} from "lucide-react";
import type { Book } from "@shared/schema";
import { Link } from "wouter";

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const COVER_GRADIENTS = [
  "from-blue-500 via-blue-600 to-blue-800",
  "from-emerald-500 via-emerald-600 to-emerald-800",
  "from-violet-500 via-violet-600 to-violet-800",
  "from-amber-500 via-amber-600 to-amber-800",
  "from-rose-500 via-rose-600 to-rose-800",
  "from-cyan-500 via-cyan-600 to-cyan-800",
  "from-orange-500 via-orange-600 to-orange-800",
  "from-indigo-500 via-indigo-600 to-indigo-800",
  "from-teal-500 via-teal-600 to-teal-800",
  "from-pink-500 via-pink-600 to-pink-800",
];

function getCoverGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

function BookCard({
  book,
  onDownload,
}: {
  book: Book;
  onDownload: (b: Book) => void;
}) {
  return (
    <div className="group flex flex-col" data-testid={`card-book-${book.id}`}>
      {/* Cover */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 mb-3 border border-border/40">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            crossOrigin="anonymous"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-b ${getCoverGradient(book.title)} flex flex-col items-end justify-between p-3`}
          >
            {/* Decorative spine lines */}
            <div className="flex flex-col gap-1 w-full mt-6">
              <div className="h-0.5 bg-white/20 rounded-full w-full" />
              <div className="h-0.5 bg-white/20 rounded-full w-3/4" />
            </div>
            <div className="w-full">
              <p className="text-white/95 text-[11px] font-bold leading-tight line-clamp-4 text-left mb-3">
                {book.title}
              </p>
              <p className="text-white/60 text-[9px] uppercase tracking-widest text-left">
                {book.author}
              </p>
            </div>
          </div>
        )}

        {/* Hover overlay with download */}
        {book.filePath && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl">
            <button
              onClick={() => onDownload(book)}
              className="bg-white text-gray-900 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl hover:bg-gray-50 active:scale-95 transition-all"
              data-testid={`button-download-${book.id}`}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 px-0.5">
        <Badge
          variant="secondary"
          className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
        >
          {book.category}
        </Badge>
        <h3
          className="font-semibold text-xs leading-snug line-clamp-2 text-foreground"
          data-testid={`text-title-${book.id}`}
        >
          {book.title}
        </h3>
        <p className="text-[11px] text-muted-foreground truncate">
          {book.author}
        </p>
        <div className="flex items-center justify-between pt-0.5">
          {book.fileSize ? (
            <span className="text-[10px] text-muted-foreground/60">
              {formatFileSize(book.fileSize)}
            </span>
          ) : !book.filePath ? (
            <span className="text-[10px] text-muted-foreground/40 italic">
              No file
            </span>
          ) : (
            <span className="text-[10px] text-emerald-500/80 font-medium">
              Available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[2/3] rounded-2xl w-full" />
      <Skeleton className="h-3 w-1/3 rounded-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );
}

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) document.documentElement.classList.add("dark");
      return prefersDark;
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      document.documentElement.classList.toggle("dark");
      return !prev;
    });
  };

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books", search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("category", selectedCategory);
      const url = `/api/books${params.toString() ? "?" + params.toString() : ""}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/categories"],
  });

  const { data: stats } = useQuery<{
    totalBooks: number;
    totalCategories: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const handleDownload = (book: Book) => {
    const link = document.createElement("a");
    link.href = `${API_BASE}/api/books/${book.id}/download`;
    link.target = "_blank";
    link.click();
  };

  const clearSearch = () => {
    setSearch("");
    setSelectedCategory("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Sticky Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 py-3">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <BookMarked
                  className="h-4.5 w-4.5 text-primary-foreground"
                  strokeWidth={2.5}
                />
              </div>
              <div>
                <h1
                  className="text-[15px] font-bold leading-none tracking-tight text-foreground"
                  data-testid="text-site-title"
                >
                  My Library
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                  data-testid="link-admin"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add Book
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">


        {/* ── Results Count ────────────────────────────────────── */}
        {!isLoading && books.length > 0 && (
          <p className="text-[11px] text-muted-foreground mb-5">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {books.length}
            </span>{" "}
            {books.length === 1 ? "book" : "books"}
            {selectedCategory && (
              <>
                {" "}
                in{" "}
                <span className="font-semibold text-foreground">
                  "{selectedCategory}"
                </span>
              </>
            )}
            {search && (
              <>
                {" "}
                for{" "}
                <span className="font-semibold text-foreground">
                  "{search}"
                </span>
              </>
            )}
          </p>
        )}

        {/* ── Books Grid ───────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 pb-16">
            {Array.from({ length: 10 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5 shadow-inner">
              <BookOpen className="h-9 w-9 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1 text-foreground">
              {search || selectedCategory
                ? "No results found"
                : "Library is empty"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              {search || selectedCategory
                ? "Try a different search term or browse all categories."
                : "Add your first book to start building your personal library."}
            </p>
            {search || selectedCategory ? (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Clear filter
              </Button>
            ) : (
              <Link href="/admin">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Your First Book
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 pb-16">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onDownload={handleDownload} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-5 mt-auto bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookMarked className="h-3.5 w-3.5 text-primary/70" />
            <span className="font-medium text-foreground/70">My Library</span>
          </div>
          <span>
            {stats
              ? `${stats.totalBooks} books across ${stats.totalCategories} categories`
              : ""}
          </span>
        </div>
      </footer>
    </div>
  );
}
