import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { getBreadcrumbPath, getSubfolders, getFlattenedFolderTree } from '../services/folderService';

export function useFolders() {
  const allFolders = useLiveQuery(() => db.folders.toArray(), []) || [];
  const folders = allFolders.filter((f) => !f.bookId && f.type !== 'highlight');

  const folderCounts = useLiveQuery(async () => {
    const allBooks = await db.books.toArray();
    const allFoldersList = await db.folders.toArray();
    const bookFolders = allFoldersList.filter((f) => !f.bookId && f.type !== 'highlight');
    const counts = new Map<string, { bookCount: number; subfolderCount: number }>();

    for (const folder of bookFolders) {
      const bookCount = allBooks.filter((b) => b.folderId === folder.id).length;
      const subfolderCount = bookFolders.filter((f) => f.parentId === folder.id).length;
      counts.set(folder.id, { bookCount, subfolderCount });
    }

    return counts;
  }, []) || new Map<string, { bookCount: number; subfolderCount: number }>();

  return {
    folders,
    isLoading: allFolders === undefined,
    folderCounts,
    getSubfolders: (parentId: string | null) => getSubfolders(parentId, folders),
    getBreadcrumbs: (currentFolderId: string | null) => getBreadcrumbPath(currentFolderId, folders),
    getFolderTree: (excludeId?: string | null) => getFlattenedFolderTree(folders, excludeId),
    rootFolders: folders.filter((f) => !f.parentId),
  };
}

export function useHighlightFolders(bookId: string | undefined) {
  const allFolders = useLiveQuery(() => db.folders.toArray(), []) || [];
  const folders = allFolders.filter(
    (f) => f.bookId === bookId || (f.type === 'highlight' && f.bookId === bookId)
  );

  const highlightFolderCounts = useLiveQuery(async () => {
    if (!bookId) return new Map<string, { highlightCount: number; subfolderCount: number }>();
    const allHighlights = await db.highlights.where('bookId').equals(bookId).toArray();
    const allFoldersList = await db.folders.toArray();
    const hlFolders = allFoldersList.filter((f) => f.bookId === bookId);
    const counts = new Map<string, { highlightCount: number; subfolderCount: number }>();

    for (const folder of hlFolders) {
      const highlightCount = allHighlights.filter((h) => h.folderId === folder.id).length;
      const subfolderCount = hlFolders.filter((f) => f.parentId === folder.id).length;
      counts.set(folder.id, { highlightCount, subfolderCount });
    }

    return counts;
  }, [bookId]) || new Map<string, { highlightCount: number; subfolderCount: number }>();

  return {
    folders,
    isLoading: allFolders === undefined,
    highlightFolderCounts,
    getSubfolders: (parentId: string | null) => getSubfolders(parentId, folders),
    getBreadcrumbs: (currentFolderId: string | null) => getBreadcrumbPath(currentFolderId, folders),
    getFolderTree: (excludeId?: string | null) => getFlattenedFolderTree(folders, excludeId),
    rootFolders: folders.filter((f) => !f.parentId),
  };
}

export function useFolder(id: string | null | undefined) {
  const folder = useLiveQuery(
    () => (id ? db.folders.get(id) : undefined),
    [id]
  );

  return {
    folder,
    isLoading: Boolean(id) && folder === undefined,
  };
}
