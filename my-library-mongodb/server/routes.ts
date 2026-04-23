import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertBookSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.LIBRARY_ADMIN_PASSWORD || "";

export async function registerRoutes(httpServer: Server, app: Express) {
  // Get all books (with optional search & category filter)
  app.get("/api/books", async (req, res) => {
    const { search, category } = req.query;
    let books;
    if (search && typeof search === "string") {
      books = await storage.searchBooks(search);
    } else if (category && typeof category === "string") {
      books = await storage.getBooksByCategory(category);
    } else {
      books = await storage.getBooks();
    }
    res.json(books);
  });

  // Get categories
  app.get("/api/categories", async (_req, res) => {
    res.json(await storage.getCategories());
  });

  // Get stats
  app.get("/api/stats", async (_req, res) => {
    const categories = await storage.getCategories();
    const count = await storage.getBookCount();
    res.json({ totalBooks: count, totalCategories: categories.length });
  });

  // Get single book
  app.get("/api/books/:id", async (req, res) => {
    const book = await storage.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  });

  // Add book (admin)
  app.post("/api/books", upload.single("file"), async (req, res) => {
    const { password, title, author, category, description, coverUrl } = req.body;

    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const bookData: any = {
      title: title || "",
      author: author || "",
      category: category || "Uncategorized",
      description: description || "",
      coverUrl: coverUrl || "",
      fileName: "",
      fileSize: 0,
      filePath: "",
    };

    if (req.file) {
      const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const finalPath = path.join(uploadsDir, safeName);
      fs.renameSync(req.file.path, finalPath);
      bookData.fileName = req.file.originalname;
      bookData.fileSize = req.file.size;
      bookData.filePath = safeName;
    }

    const parsed = insertBookSchema.safeParse(bookData);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const book = await storage.addBook(parsed.data);
    res.status(201).json(book);
  });

  // Download book file
  app.get("/api/books/:id/download", async (req, res) => {
    const book = await storage.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (!book.filePath) return res.status(404).json({ error: "No file available" });

    const filePath = path.join(uploadsDir, book.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(book.fileName || 'book')}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  // Delete book (admin)
  app.delete("/api/books/:id", async (req, res) => {
    const { password } = req.body;
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const book = await storage.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    // Delete file
    if (book.filePath) {
      const filePath = path.join(uploadsDir, book.filePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await storage.deleteBook(book.id);
    res.json({ success: true });
  });
}
