export type LibraryBook = {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  description: string;
  tags: string[];
  coverUrl: string;
  coverPathname: string;
  fileUrl?: string;
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
