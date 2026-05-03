export type LibraryBook = {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  description: string;
  tags: string[];
  coverUrl: string;
  imageUrl?: string;
  cover_url?: string;
  thumbnailUrl?: string;
  cover?: string;
  coverPathname: string;
  pdfUrl?: string;
  fileUrl?: string;
  pdf_url?: string;
  downloadUrl?: string;
  filePathname: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  hasFile: boolean;
  addedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LibraryStats = {
  totalBooks: number;
  categoriesCount: number;
};

export type LibraryBooksResponse = {
  books: LibraryBook[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
