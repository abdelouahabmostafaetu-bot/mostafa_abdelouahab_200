export type LibraryBook = {
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
};

export type LibraryStats = {
  totalBooks: number;
  categoriesCount: number;
};
