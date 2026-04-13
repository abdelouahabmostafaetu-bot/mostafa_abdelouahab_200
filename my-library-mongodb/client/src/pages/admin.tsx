import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  BookPlus,
  Loader2,
  Trash2,
  Lock,
  BookOpen,
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import type { Book } from "@shared/schema";
import { Link } from "wouter";

/* ── Constants ──────────────────────────────────────────────── */
const ADMIN_PASSWORD = "library2024";

const PRESET_CATEGORIES = [
  "Mathematics",
  "Physics",
  "Computer Science",
  "Programming",
  "Engineering",
  "Literature",
  "Philosophy",
  "History",
  "Biology",
  "Chemistry",
  "Economics",
  "Psychology",
  "Art",
  "Music",
  "Languages",
  "Other",
];

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* ── Login Screen ───────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      toast({ title: "Please enter a password", variant: "destructive" });
      return;
    }
    setIsChecking(true);
    // Small delay for UX feel, then validate locally
    await new Promise((r) => setTimeout(r, 400));
    if (password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      toast({
        title: "Incorrect password",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setIsChecking(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 p-8">
          {/* Icon */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Lock className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Enter your password to manage the library
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="pr-10 h-11 rounded-xl border-border/70 bg-background focus-visible:ring-primary/40"
                  data-testid="input-admin-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              className="w-full h-11 rounded-xl font-semibold"
              onClick={handleLogin}
              disabled={isChecking || !password.trim()}
              data-testid="button-login"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Enter Dashboard"
              )}
            </Button>
          </div>

          {/* Back link */}
          <div className="mt-6 text-center">
            <Link href="/">
              <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Library
              </button>
            </Link>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
          Library Management System
        </p>
      </div>
    </div>
  );
}

/* ── Main Admin Dashboard ───────────────────────────────────── */
function AdminDashboard({ password }: { password: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const effectiveCategory =
    category === "__custom__" ? customCategory.trim() : category;

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("title", title.trim());
      formData.append("author", author.trim());
      formData.append("category", effectiveCategory);
      formData.append("description", description.trim());
      formData.append("coverUrl", coverUrl.trim());
      if (file) formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to add book");
      }
      return res.json();
    },
    onSuccess: (book: Book) => {
      toast({
        title: "Book added successfully",
        description: `"${book.title}" is now in your library.`,
      });
      setTitle("");
      setAuthor("");
      setDescription("");
      setCoverUrl("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to add book",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    title.trim() &&
    author.trim() &&
    effectiveCategory &&
    !addMutation.isPending;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/books/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(err.error || "Delete failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Book removed", description: "Deleted from library." });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <BookPlus
                  className="h-3.5 w-3.5 text-primary-foreground"
                  strokeWidth={2.5}
                />
              </div>
              <h1 className="text-[15px] font-bold tracking-tight">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                <span className="font-semibold text-foreground">
                  {books.length}
                </span>{" "}
                books total
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Add Book Form ────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Form header */}
              <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-2">
                  <BookPlus className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm">Add New Book</h2>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Fill in the details below to add a book
                </p>
              </div>

              {/* Form body */}
              <div className="px-6 py-5 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Introduction to Algorithms"
                    className="h-10 rounded-xl text-sm border-border/70 focus-visible:ring-primary/40"
                    data-testid="input-title"
                  />
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Author <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Thomas H. Cormen"
                    className="h-10 rounded-xl text-sm border-border/70 focus-visible:ring-primary/40"
                    data-testid="input-author"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger
                      className="h-10 rounded-xl text-sm border-border/70 focus:ring-primary/40"
                      data-testid="select-category"
                    >
                      <SelectValue placeholder="Select a category…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {PRESET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-sm">
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="__custom__"
                        className="text-sm text-primary"
                      >
                        + Custom category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {category === "__custom__" && (
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Type your custom category…"
                      className="h-10 rounded-xl text-sm border-border/70 focus-visible:ring-primary/40 mt-2"
                    />
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Description{" "}
                    <span className="font-normal normal-case tracking-normal opacity-60">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief description of the book…"
                    rows={3}
                    className="rounded-xl text-sm border-border/70 resize-none focus-visible:ring-primary/40"
                    data-testid="input-description"
                  />
                </div>

                {/* Cover URL */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cover Image URL{" "}
                    <span className="font-normal normal-case tracking-normal opacity-60">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="h-10 rounded-xl text-sm border-border/70 focus-visible:ring-primary/40"
                    data-testid="input-cover"
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Book File{" "}
                    <span className="font-normal normal-case tracking-normal opacity-60">
                      (optional)
                    </span>
                  </Label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-150 p-4 text-center ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : file
                          ? "border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                    }`}
                    data-testid="input-file"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.epub,.djvu,.mobi,.azw,.azw3,.txt,.doc,.docx"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-medium truncate text-foreground">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-2">
                        <Upload className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1.5" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Drop file here or{" "}
                          <span className="text-primary">browse</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          PDF, EPUB, DJVU, MOBI, TXT, DOC
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <Button
                  className="w-full h-11 rounded-xl font-semibold gap-2 mt-1"
                  onClick={() => addMutation.mutate()}
                  disabled={!canSubmit}
                  data-testid="button-add-book"
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding book…
                    </>
                  ) : (
                    <>
                      <BookPlus className="h-4 w-4" />
                      Add to Library
                    </>
                  )}
                </Button>

                {/* Status feedback */}
                {addMutation.isSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600 text-xs bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Book added successfully!
                  </div>
                )}
                {addMutation.isError && (
                  <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/5 rounded-lg px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {(addMutation.error as Error)?.message ||
                      "Something went wrong"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Book List ────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                All Books
              </h2>
              {books.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs font-medium rounded-full px-2.5"
                >
                  {books.length} total
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 animate-pulse"
                  >
                    <div className="w-10 h-14 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded-full w-2/3" />
                      <div className="h-2.5 bg-muted rounded-full w-1/3" />
                      <div className="h-2 bg-muted rounded-full w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  No books yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Add your first book using the form on the left
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="group rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all duration-150 p-3.5 flex items-center gap-3"
                    data-testid={`admin-book-${book.id}`}
                  >
                    {/* Book icon / mini cover */}
                    <div className="w-10 h-14 rounded-lg bg-gradient-to-b from-primary/20 to-primary/5 border border-border/60 flex items-center justify-center shrink-0">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover rounded-lg"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <BookOpen className="h-4 w-4 text-primary/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground leading-tight">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {book.author}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0 rounded-md"
                        >
                          {book.category}
                        </Badge>
                        {book.fileName && (
                          <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {book.fileName}
                            {book.fileSize
                              ? ` · ${formatFileSize(book.fileSize)}`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      onClick={() => deleteMutation.mutate(book.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${book.id}`}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Page Export ────────────────────────────────────────────── */
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    setPassword(ADMIN_PASSWORD);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AdminDashboard password={password} />;
}
