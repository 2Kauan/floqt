import { db } from '../db/database';
import { Folder } from '../types';
import { generateId } from '../utils/id';

export const SAMSUNG_FOLDER_COLORS = [
  { name: 'Coral', value: '#FF6B6B' },
  { name: 'Laranja', value: '#FFA94D' },
  { name: 'Âmbar', value: '#FFD43B' },
  { name: 'Verde Menta', value: '#51CF66' },
  { name: 'Turquesa', value: '#20C997' },
  { name: 'Azul Céu', value: '#339AF0' },
  { name: 'Índigo', value: '#845EF7' },
  { name: 'Rosa Vibrante', value: '#F06595' },
  { name: 'Cinza Ardósia', value: '#868E96' },
];

export const DEFAULT_FOLDER_COLOR = SAMSUNG_FOLDER_COLORS[1].value; // #FFA94D

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  color?: string;
  bookId?: string | null;
  type?: 'book' | 'highlight';
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  color?: string;
}

export async function getFolders(): Promise<Folder[]> {
  return db.folders.toArray();
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  return db.folders.get(id);
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const now = new Date().toISOString();
  const folder: Folder = {
    id: generateId(),
    name: input.name.trim(),
    parentId: input.parentId || null,
    color: input.color || DEFAULT_FOLDER_COLOR,
    bookId: input.bookId || null,
    type: input.type || (input.bookId ? 'highlight' : 'book'),
    createdAt: now,
    updatedAt: now,
  };

  await db.folders.put(folder);
  return folder;
}

export async function updateFolder(id: string, updates: UpdateFolderInput): Promise<Folder> {
  const existing = await db.folders.get(id);
  if (!existing) {
    throw new Error('Pasta não encontrada.');
  }

  // Prevent setting parent to itself
  if (updates.parentId === id) {
    throw new Error('Uma pasta não pode ser subpasta de si mesma.');
  }

  const now = new Date().toISOString();
  const updatedFolder: Folder = {
    ...existing,
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    parentId: updates.parentId !== undefined ? updates.parentId : existing.parentId,
    color: updates.color !== undefined ? updates.color : existing.color,
    updatedAt: now,
  };

  await db.folders.put(updatedFolder);
  return updatedFolder;
}

/**
 * Delete a folder.
 * All books / highlights in this folder and its subfolders are moved to root (folderId: null).
 * Subfolders are recursively deleted.
 */
export async function deleteFolder(id: string): Promise<void> {
  const allFolders = await db.folders.toArray();

  // Find all descendant folder IDs recursively
  const descendantIds = new Set<string>();
  function findDescendants(parentId: string) {
    descendantIds.add(parentId);
    const children = allFolders.filter((f) => f.parentId === parentId);
    for (const child of children) {
      findDescendants(child.id);
    }
  }
  findDescendants(id);

  await db.transaction('rw', [db.folders, db.books, db.highlights], async () => {
    // 1. Move all books in deleted folders to root (folderId: null)
    const books = await db.books.toArray();
    for (const book of books) {
      if (book.folderId && descendantIds.has(book.folderId)) {
        await db.books.update(book.id, { folderId: null });
      }
    }

    // 2. Move all highlights in deleted folders to root (folderId: null)
    const highlights = await db.highlights.toArray();
    for (const highlight of highlights) {
      if (highlight.folderId && descendantIds.has(highlight.folderId)) {
        await db.highlights.update(highlight.id, { folderId: null });
      }
    }

    // 3. Delete the folders
    for (const folderId of descendantIds) {
      await db.folders.delete(folderId);
    }
  });
}

export async function moveBookToFolder(bookId: string, folderId: string | null): Promise<void> {
  await db.books.update(bookId, {
    folderId: folderId || null,
    updatedAt: new Date().toISOString(),
  });
}

export async function moveHighlightToFolder(highlightId: string, folderId: string | null): Promise<void> {
  await db.highlights.update(highlightId, {
    folderId: folderId || null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Helper to build ancestor path for breadcrumb navigation
 */
export function getBreadcrumbPath(
  currentFolderId: string | null,
  folders: Folder[]
): Folder[] {
  if (!currentFolderId) return [];

  const path: Folder[] = [];
  let currentId: string | null = currentFolderId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = folders.find((f) => f.id === currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

/**
 * Helper to get subfolders of a given parent folder
 */
export function getSubfolders(
  parentId: string | null,
  folders: Folder[]
): Folder[] {
  return folders.filter((f) => f.parentId === (parentId || null));
}

export interface FolderTreeNode extends Folder {
  depth: number;
  labelPath: string;
}

/**
 * Flattens folders into hierarchical ordered list with indentation depth for dropdowns
 */
export function getFlattenedFolderTree(
  folders: Folder[],
  excludeId?: string | null
): FolderTreeNode[] {
  const result: FolderTreeNode[] = [];

  function traverse(parentId: string | null, depth: number, prefix: string) {
    const children = folders
      .filter((f) => f.parentId === parentId && f.id !== excludeId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    for (const child of children) {
      const labelPath = prefix ? `${prefix} / ${child.name}` : child.name;
      result.push({
        ...child,
        depth,
        labelPath,
      });
      traverse(child.id, depth + 1, labelPath);
    }
  }

  traverse(null, 0, '');
  return result;
}
