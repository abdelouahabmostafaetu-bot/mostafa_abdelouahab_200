import { z } from "zod";

// Book type (what the API returns)
export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  addedAt: string;
}

// Insert schema (for form validation)
export const insertBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional().default(""),
  coverUrl: z.string().optional().default(""),
  fileName: z.string().optional().default(""),
  fileSize: z.number().optional().default(0),
  filePath: z.string().optional().default(""),
});

export type InsertBook = z.infer<typeof insertBookSchema>;
