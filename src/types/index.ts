export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null for root level, folderId for subfolders
  color: string; // Hex color code (e.g., #FF6B6B, #FFA94D)
  bookId?: string | null; // null for library/shelf folders, or bookId for folders within a book
  type?: 'book' | 'highlight'; // 'book' (default) or 'highlight'
  order?: number;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string | null;
  year: number | null;
  tags: string[];
  coverId: string | null;
  folderId?: string | null; // null or undefined for root shelf
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

export interface Highlight {
  id: string;
  bookId: string;
  folderId?: string | null; // null or undefined for root book highlights
  text: string;
  page: number | null;
  comment: string | null;
  tags: string[];
  order?: number;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

export interface CoverImage {
  id: string;
  blob: Blob;
  mimeType: string;
  originalSource: 'upload' | 'api' | 'camera';
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  id: 'singleton';
  theme: ThemeMode;
  lastExportAt: string | null; // ISO8601
}

export type ShelfSortOption = 'recent' | 'title_asc' | 'highlights_desc' | 'author_asc';

export interface ShelfFilters {
  searchQuery: string;
  selectedGenre: string | null;
  selectedTag: string | null;
  sortBy: ShelfSortOption;
}

export interface ExportBookData extends Omit<Book, 'coverId'> {
  coverFilename: string | null;
  coverBase64?: string | null;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  folders?: Folder[];
  books: ExportBookData[];
  highlights: Highlight[];
  settings?: AppSettings;
  covers?: Record<string, string>;
}

export type ConflictResolutionOption = 'merge' | 'replace' | 'skip';

export interface BookConflict {
  incomingBook: ExportBookData;
  existingBook: Book;
  incomingHighlights: Highlight[];
  resolution: ConflictResolutionOption;
}

export interface ImportPreviewData {
  totalBooks: number;
  totalHighlights: number;
  folders?: Folder[];
  newBooks: ExportBookData[];
  newHighlights: Highlight[];
  conflicts: BookConflict[];
  coverBlobs: Map<string, Blob>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

