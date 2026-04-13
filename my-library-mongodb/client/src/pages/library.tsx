import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, BookOpen, Library, Moon, Sun, Plus, Filter } from "lucide-react";
import type { Book } from "@shared/schema";
import { Link } from "wouter";

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDark, setIsDark] = useState(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) document.documentElement.classList.add("dark");
    return prefersDark;
  });

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books", search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("category", selectedCategory);
      const url = `/api/books${params.toString() ? "?" + params : ""}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/categories"],
  });

  const { data: stats } = useQuery<{ totalBooks: number; totalCategories: number }>({
    queryKey: ["/api/stats"],
  });

  const handleDownload = (book: Book) => {
    const link = document.createElement("a");
    link.href = `${API_BASE}/api/books/${book.id}/download`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Library className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight" data-testid="text-site-title">My Library</h1>
                <p className="text-xs text-muted-foreground">
                  {stats ? `${stats.totalBooks} books · ${stats.totalCategories} categories` : "Loading..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="link-admin">
                  <Plus className="h-4 w-4 mr-1" /> Add Book
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title, author, or category..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedCategory(""); }}
              className="pl-10 h-11"
              data-testid="input-search"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="filter-categories">
              <Button
                variant={selectedCategory === "" ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedCategory(""); setSearch(""); }}
                className="text-xs"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedCategory(cat); setSearch(""); }}
                  className="text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Books Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No books found</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {search || selectedCategory ? "Try a different search or category" : "Add your first book from the admin panel"}
            </p>
            {!search && !selectedCategory && (
              <Link href="/admin">
                <Button className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Your First Book
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="group rounded-xl border border-border bg-card hover:border-primary/30 transition-colors duration-200 overflow-hidden"
                data-testid={`card-book-${book.id}`}
              >
                {/* Cover */}
                {book.coverUrl ? (
                  <div className="aspect-[3/2] bg-muted overflow-hidden">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/2] bg-gradient-to-br from-primary/15 via-muted to-muted/50 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-primary/30" />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {book.category}
                  </Badge>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2" data-testid={`text-title-${book.id}`}>
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{book.author}</p>

                  {book.description && (
                    <p className="text-xs text-muted-foreground/70 line-clamp-2">{book.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {book.filePath ? (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(book)}
                        className="text-xs h-8"
                        data-testid={`button-download-${book.id}`}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No file</span>
                    )}
                    {book.fileSize ? (
                      <span className="text-[10px] text-muted-foreground">
                        {formatFileSize(book.fileSize)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
