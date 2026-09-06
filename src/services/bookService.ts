import { db } from '../db/database';
import { Book } from '../types';
import { generateId } from '../utils/id';
import { deleteCoverImage } from './coverService';

export interface CreateBookInput {
  title: string;
  author?: string;
  genre?: string | null;
  year?: number | null;
  tags?: string[];
  coverId?: string | null;
  folderId?: string | null;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  genre?: string | null;
  year?: number | null;
  tags?: string[];
  coverId?: string | null;
  folderId?: string | null;
}

export async function getBooks(): Promise<Book[]> {
  return db.books.toArray();
}

export async function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

export async function createBook(input: CreateBookInput): Promise<Book> {
  const now = new Date().toISOString();
  const book: Book = {
    id: generateId(),
    title: input.title.trim(),
    author: input.author ? input.author.trim() : '',
    genre: input.genre ? input.genre.trim() : null,
    year: input.year ? Number(input.year) : null,
    tags: input.tags ? input.tags.map((t) => t.trim()).filter(Boolean) : [],
    coverId: input.coverId ?? null,
    folderId: input.folderId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.books.put(book);
  return book;
}

export async function updateBook(id: string, updates: UpdateBookInput): Promise<Book> {
  const existing = await db.books.get(id);
  if (!existing) {
    throw new Error('Livro não encontrado.');
  }

  const now = new Date().toISOString();
  const updatedBook: Book = {
    ...existing,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    author: updates.author !== undefined ? updates.author.trim() : existing.author,
    genre: updates.genre !== undefined ? (updates.genre ? updates.genre.trim() : null) : existing.genre,
    year: updates.year !== undefined ? (updates.year ? Number(updates.year) : null) : existing.year,
    tags: updates.tags !== undefined ? updates.tags.map((t) => t.trim()).filter(Boolean) : existing.tags,
    coverId: updates.coverId !== undefined ? updates.coverId : existing.coverId,
    folderId: updates.folderId !== undefined ? updates.folderId : existing.folderId,
    updatedAt: now,
  };

  // If coverId changed, clean up previous cover if it existed
  if (updates.coverId !== undefined && existing.coverId && existing.coverId !== updates.coverId) {
    await deleteCoverImage(existing.coverId).catch(() => {});
  }

  await db.books.put(updatedBook);
  return updatedBook;
}

export async function deleteBook(id: string): Promise<void> {
  const existing = await db.books.get(id);
  if (!existing) return;

  await db.transaction('rw', [db.books, db.highlights, db.coverImages], async () => {
    // 1. Delete associated cover image
    if (existing.coverId) {
      await db.coverImages.delete(existing.coverId);
    }

    // 2. Cascade delete all highlights of this book
    await db.highlights.where('bookId').equals(id).delete();

    // 3. Delete book record
    await db.books.delete(id);
  });
}
