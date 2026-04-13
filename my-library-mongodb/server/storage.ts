import { BookModel } from "./db";
import type { Book, InsertBook } from "@shared/schema";

function docToBook(doc: any): Book {
  return {
    id: doc._id.toString(),
    title: doc.title,
    author: doc.author,
    category: doc.category,
    description: doc.description || "",
    coverUrl: doc.coverUrl || "",
    fileName: doc.fileName || "",
    fileSize: doc.fileSize || 0,
    filePath: doc.filePath || "",
    addedAt: doc.addedAt,
  };
}

export interface IStorage {
  getBooks(): Promise<Book[]>;
  getBookById(id: string): Promise<Book | undefined>;
  searchBooks(query: string): Promise<Book[]>;
  getBooksByCategory(category: string): Promise<Book[]>;
  getCategories(): Promise<string[]>;
  addBook(book: InsertBook): Promise<Book>;
  deleteBook(id: string): Promise<void>;
  getBookCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getBooks(): Promise<Book[]> {
    const docs = await BookModel.find().sort({ _id: -1 });
    return docs.map(docToBook);
  }

  async getBookById(id: string): Promise<Book | undefined> {
    try {
      const doc = await BookModel.findById(id);
      return doc ? docToBook(doc) : undefined;
    } catch {
      return undefined;
    }
  }

  async searchBooks(query: string): Promise<Book[]> {
    const regex = new RegExp(query, "i");
    const docs = await BookModel.find({
      $or: [
        { title: regex },
        { author: regex },
        { category: regex },
      ],
    }).sort({ _id: -1 });
    return docs.map(docToBook);
  }

  async getBooksByCategory(category: string): Promise<Book[]> {
    const docs = await BookModel.find({ category }).sort({ _id: -1 });
    return docs.map(docToBook);
  }

  async getCategories(): Promise<string[]> {
    const categories = await BookModel.distinct("category");
    return categories.sort();
  }

  async addBook(book: InsertBook): Promise<Book> {
    const doc = await BookModel.create({
      title: book.title,
      author: book.author,
      category: book.category,
      description: book.description || "",
      coverUrl: book.coverUrl || "",
      fileName: book.fileName || "",
      fileSize: book.fileSize || 0,
      filePath: book.filePath || "",
      addedAt: new Date().toISOString(),
    });
    return docToBook(doc);
  }

  async deleteBook(id: string): Promise<void> {
    await BookModel.findByIdAndDelete(id);
  }

  async getBookCount(): Promise<number> {
    return BookModel.countDocuments();
  }
}

export const storage = new DatabaseStorage();
