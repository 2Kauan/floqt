import Dexie, { Table } from 'dexie';
import { Book, Highlight, CoverImage, AppSettings, Folder } from '../types';

export class FloqtDatabase extends Dexie {
  books!: Table<Book, string>;
  highlights!: Table<Highlight, string>;
  coverImages!: Table<CoverImage, string>;
  settings!: Table<AppSettings, string>;
  folders!: Table<Folder, string>;

  constructor() {
    super('marginaliaDB');
    this.version(1).stores({
      books: 'id, title, author, createdAt, *tags',
      highlights: 'id, bookId, createdAt, [bookId+createdAt], *tags',
      coverImages: 'id',
      settings: 'id',
    });
    this.version(2).stores({
      books: 'id, title, author, folderId, createdAt, *tags',
      highlights: 'id, bookId, folderId, createdAt, [bookId+createdAt], *tags',
      coverImages: 'id',
      settings: 'id',
      folders: 'id, parentId, bookId, type, name, order, createdAt',
    });
  }
}

export const db = new FloqtDatabase();

// Initialize singleton settings if absent
export async function initializeDatabase(): Promise<void> {
  const existingSettings = await db.settings.get('singleton');
  if (!existingSettings) {
    await db.settings.put({
      id: 'singleton',
      theme: 'light',
      lastExportAt: null,
    });
  }
}
