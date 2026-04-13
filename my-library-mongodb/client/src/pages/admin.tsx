import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, BookPlus, Check, Loader2, Trash2, Lock } from "lucide-react";
import type { Book } from "@shared/schema";
import { Link } from "wouter";

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

export default function AdminPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("title", title);
      formData.append("author", author);
      formData.append("category", category === "__custom__" ? customCategory : category);
      formData.append("description", description);
      formData.append("coverUrl", coverUrl);
      if (file) formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add book");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Book added", description: `"${title}" has been added to your library.` });
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/books/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Book removed from library." });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const handleLogin = async () => {
    // Test password by trying to add a dummy request check
    try {
      const res = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("password", password);
          fd.append("title", "__test__");
          fd.append("author", "__test__");
          fd.append("category", "__test__");
          return fd;
        })(),
      });
      if (res.status === 401) {
        toast({ title: "Wrong password", variant: "destructive" });
        return;
      }
      // If it succeeded, delete the test book
      const book = await res.json();
      await fetch(`${API_BASE}/api/books/${book.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setIsAuthenticated(true);
    } catch {
      toast({ title: "Error connecting", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-primary/10 mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter your password to manage books</p>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              data-testid="input-admin-password"
            />
            <Button className="w-full" onClick={handleLogin} data-testid="button-login">
              Enter
            </Button>
          </div>
          <div className="text-center">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Library
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Add a Book</h1>
          </div>
          <span className="text-xs text-muted-foreground">{books.length} books in library</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Add Book Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BookPlus className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">New Book</h2>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Calculus by James Stewart"
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Author *</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. James Stewart"
                  data-testid="input-author"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Custom category</SelectItem>
                  </SelectContent>
                </Select>
                {category === "__custom__" && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Type your category"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description..."
                  rows={2}
                  data-testid="input-description"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cover Image URL (optional)</Label>
                <Input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                  data-testid="input-cover"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Book File (PDF, EPUB, etc.)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.epub,.djvu,.mobi,.azw,.azw3,.txt,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-xs"
                    data-testid="input-file"
                  />
                </div>
                {file && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => addMutation.mutate()}
                disabled={!title || !author || !category || (category === "__custom__" && !customCategory) || addMutation.isPending}
                data-testid="button-add-book"
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Add to Library
              </Button>
            </div>
          </div>

          {/* Recent Books */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Recent Books</h2>
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-2.5 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : books.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No books yet. Add your first one.</p>
              ) : (
                books.slice(0, 20).map((book) => (
                  <div
                    key={book.id}
                    className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
                    data-testid={`admin-book-${book.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {book.author} · {book.category}
                        {book.fileName && ` · ${book.fileName}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0 h-8 w-8"
                      onClick={() => deleteMutation.mutate(book.id)}
                      data-testid={`button-delete-${book.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
