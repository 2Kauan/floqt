import { db } from '../db/database';
import { Highlight } from '../types';
import { generateId } from '../utils/id';

export interface CreateHighlightInput {
  bookId: string;
  folderId?: string | null;
  text: string;
  page?: number | null;
  comment?: string | null;
  tags?: string[];
}

export interface UpdateHighlightInput {
  folderId?: string | null;
  text?: string;
  page?: number | null;
  comment?: string | null;
  tags?: string[];
}

export async function getHighlightsByBook(bookId: string): Promise<Highlight[]> {
  return db.highlights
    .where('bookId')
    .equals(bookId)
    .reverse()
    .sortBy('createdAt');
}

export async function getAllHighlights(): Promise<Highlight[]> {
  return db.highlights.reverse().sortBy('createdAt');
}

export async function getHighlight(id: string): Promise<Highlight | undefined> {
  return db.highlights.get(id);
}

export async function createHighlight(input: CreateHighlightInput): Promise<Highlight> {
  const now = new Date().toISOString();
  const highlight: Highlight = {
    id: generateId(),
    bookId: input.bookId,
    folderId: input.folderId || null,
    text: input.text.trim(),
    page: input.page ? Number(input.page) : null,
    comment: input.comment ? input.comment.trim() : null,
    tags: input.tags ? input.tags.map((t) => t.trim()).filter(Boolean) : [],
    createdAt: now,
    updatedAt: now,
  };

  await db.highlights.put(highlight);
  return highlight;
}

export async function updateHighlight(
  id: string,
  updates: UpdateHighlightInput
): Promise<Highlight> {
  const existing = await db.highlights.get(id);
  if (!existing) {
    throw new Error('Destaque não encontrado.');
  }

  const now = new Date().toISOString();
  const updatedHighlight: Highlight = {
    ...existing,
    ...updates,
    folderId: updates.folderId !== undefined ? updates.folderId : existing.folderId,
    text: updates.text !== undefined ? updates.text.trim() : existing.text,
    page: updates.page !== undefined ? (updates.page ? Number(updates.page) : null) : existing.page,
    comment: updates.comment !== undefined ? (updates.comment ? updates.comment.trim() : null) : existing.comment,
    tags: updates.tags !== undefined ? updates.tags.map((t) => t.trim()).filter(Boolean) : existing.tags,
    updatedAt: now,
  };

  await db.highlights.put(updatedHighlight);
  return updatedHighlight;
}

export async function deleteHighlight(id: string): Promise<void> {
  await db.highlights.delete(id);
}

export async function reorderHighlights(orderedHighlightIds: string[]): Promise<void> {
  await db.transaction('rw', db.highlights, async () => {
    for (let i = 0; i < orderedHighlightIds.length; i++) {
      await db.highlights.update(orderedHighlightIds[i], { order: i });
    }
  });
}
