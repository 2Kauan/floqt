import JSZip from 'jszip';
import { db } from '../db/database';
import {
  Book,
  BookConflict,
  ConflictResolutionOption,
  CoverImage,
  ExportBookData,
  ExportData,
  Highlight,
  ImportPreviewData,
} from '../types';
import { generateId } from '../utils/id';
import { base64ToBlob } from '../utils/canvas';

function normalizeString(str: string): string {
  return (str || '').trim().toLowerCase();
}

export async function parseImportText(jsonText: string): Promise<ImportPreviewData> {
  let exportData: ExportData;
  try {
    exportData = JSON.parse(jsonText);
  } catch {
    throw new Error('Texto JSON inválido ou corrompido.');
  }

  if (!exportData || !exportData.books || !Array.isArray(exportData.books)) {
    throw new Error('O JSON informado não contém uma lista de livros válida.');
  }

  // Extract cover Blobs from JSON covers dictionary and book.coverBase64
  const coverBlobs = new Map<string, Blob>();
  if (exportData.covers && typeof exportData.covers === 'object') {
    for (const [filename, base64] of Object.entries(exportData.covers)) {
      try {
        if (base64 && typeof base64 === 'string') {
          coverBlobs.set(filename, base64ToBlob(base64));
        }
      } catch {
        // Ignore corrupted base64 string
      }
    }
  }

  for (const book of exportData.books) {
    if (book.coverFilename && book.coverBase64 && !coverBlobs.has(book.coverFilename)) {
      try {
        coverBlobs.set(book.coverFilename, base64ToBlob(book.coverBase64));
      } catch {
        // Ignore
      }
    }
  }

  const existingBooks = await db.books.toArray();
  const conflicts: BookConflict[] = [];
  const newBooks: ExportBookData[] = [];
  const newHighlights: Highlight[] = [];

  const incomingHighlights = exportData.highlights || [];

  for (const incomingBook of exportData.books) {
    const bookHighlights = incomingHighlights.filter((h) => h.bookId === incomingBook.id);

    const matchedBook = existingBooks.find(
      (existing) =>
        existing.id === incomingBook.id ||
        (normalizeString(existing.title) === normalizeString(incomingBook.title) &&
          normalizeString(existing.author) === normalizeString(incomingBook.author))
    );

    if (matchedBook) {
      conflicts.push({
        incomingBook,
        existingBook: matchedBook,
        incomingHighlights: bookHighlights,
        resolution: 'merge',
      });
    } else {
      newBooks.push(incomingBook);
      newHighlights.push(...bookHighlights);
    }
  }

  return {
    totalBooks: exportData.books.length,
    totalHighlights: incomingHighlights.length,
    folders: exportData.folders || [],
    newBooks,
    newHighlights,
    conflicts,
    coverBlobs,
  };
}

export async function parseImportZip(file: File): Promise<ImportPreviewData> {
  const isJsonFile = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json';

  if (isJsonFile) {
    const text = await file.text();
    return parseImportText(text);
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    // If not a valid zip, attempt parsing as plain json
    try {
      const text = await file.text();
      return parseImportText(text);
    } catch {
      throw new Error('Arquivo inválido. Selecione um arquivo .zip ou .json exportado pelo FLOQT.');
    }
  }

  // Find library.json anywhere inside the zip
  const libraryEntryKey = Object.keys(zip.files).find(
    (path) =>
      path.toLowerCase().endsWith('library.json') &&
      !path.includes('__MACOSX') &&
      !path.startsWith('.')
  );

  if (!libraryEntryKey) {
    throw new Error('Não foi encontrado o arquivo library.json dentro do arquivo ZIP.');
  }

  let exportData: ExportData;
  try {
    const jsonText = await zip.file(libraryEntryKey)!.async('text');
    exportData = JSON.parse(jsonText);
  } catch {
    throw new Error('Não foi possível ler o arquivo library.json dentro do ZIP.');
  }

  if (!exportData || !exportData.books || !Array.isArray(exportData.books)) {
    throw new Error('Estrutura de dados inválida no arquivo library.json.');
  }

  // Extract cover Blobs from anywhere in the zip
  const coverBlobs = new Map<string, Blob>();
  const imageEntries = Object.keys(zip.files).filter((path) => {
    const lower = path.toLowerCase();
    return (
      (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) &&
      !lower.includes('__macosx') &&
      !zip.files[path].dir
    );
  });

  for (const filePath of imageEntries) {
    const fileEntry = zip.file(filePath);
    if (fileEntry) {
      const filename = filePath.split('/').pop() || filePath;
      const blob = await fileEntry.async('blob');
      coverBlobs.set(filename, blob);
    }
  }

  // Also extract any base64 covers in library.json
  if (exportData.covers && typeof exportData.covers === 'object') {
    for (const [filename, base64] of Object.entries(exportData.covers)) {
      if (!coverBlobs.has(filename) && base64 && typeof base64 === 'string') {
        try {
          coverBlobs.set(filename, base64ToBlob(base64));
        } catch {}
      }
    }
  }

  for (const book of exportData.books) {
    if (book.coverFilename && book.coverBase64 && !coverBlobs.has(book.coverFilename)) {
      try {
        coverBlobs.set(book.coverFilename, base64ToBlob(book.coverBase64));
      } catch {}
    }
  }

  const existingBooks = await db.books.toArray();
  const conflicts: BookConflict[] = [];
  const newBooks: ExportBookData[] = [];
  const newHighlights: Highlight[] = [];

  const incomingHighlights = exportData.highlights || [];

  for (const incomingBook of exportData.books) {
    const bookHighlights = incomingHighlights.filter((h) => h.bookId === incomingBook.id);

    const matchedBook = existingBooks.find(
      (existing) =>
        existing.id === incomingBook.id ||
        (normalizeString(existing.title) === normalizeString(incomingBook.title) &&
          normalizeString(existing.author) === normalizeString(incomingBook.author))
    );

    if (matchedBook) {
      conflicts.push({
        incomingBook,
        existingBook: matchedBook,
        incomingHighlights: bookHighlights,
        resolution: 'merge',
      });
    } else {
      newBooks.push(incomingBook);
      newHighlights.push(...bookHighlights);
    }
  }

  return {
    totalBooks: exportData.books.length,
    totalHighlights: incomingHighlights.length,
    folders: exportData.folders || [],
    newBooks,
    newHighlights,
    conflicts,
    coverBlobs,
  };
}

export async function executeImport(
  previewData: ImportPreviewData,
  conflictResolutions: Map<string, ConflictResolutionOption>
): Promise<{ booksImported: number; highlightsImported: number; conflictsResolved: number }> {
  let booksImported = 0;
  let highlightsImported = 0;
  let conflictsResolved = 0;

  await db.transaction('rw', [db.books, db.highlights, db.coverImages, db.folders], async () => {
    // 0. Process incoming folders
    if (previewData.folders && Array.isArray(previewData.folders)) {
      for (const folder of previewData.folders) {
        const existing = await db.folders.get(folder.id);
        if (!existing) {
          await db.folders.put({
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId || null,
            color: folder.color || '#FFA94D',
            createdAt: folder.createdAt || new Date().toISOString(),
            updatedAt: folder.updatedAt || new Date().toISOString(),
          });
        }
      }
    }

    // 1. Process brand new books and covers
    for (const bookData of previewData.newBooks) {
      let coverId: string | null = null;
      if (bookData.coverFilename && previewData.coverBlobs.has(bookData.coverFilename)) {
        const blob = previewData.coverBlobs.get(bookData.coverFilename)!;
        coverId = generateId();
        const coverImage: CoverImage = {
          id: coverId,
          blob,
          mimeType: 'image/jpeg',
          originalSource: 'upload',
        };
        await db.coverImages.put(coverImage);
      }

      const bookId = bookData.id || generateId();
      const book: Book = {
        id: bookId,
        title: bookData.title,
        author: bookData.author || '',
        genre: bookData.genre || null,
        year: bookData.year || null,
        tags: bookData.tags || [],
        coverId,
        folderId: bookData.folderId || null,
        createdAt: bookData.createdAt || new Date().toISOString(),
        updatedAt: bookData.updatedAt || new Date().toISOString(),
      };

      await db.books.put(book);
      booksImported++;

      // Save corresponding highlights
      const bookHighlights = previewData.newHighlights.filter((h) => h.bookId === bookData.id);
      for (const h of bookHighlights) {
        await db.highlights.put({
          ...h,
          id: h.id || generateId(),
          bookId: book.id,
        });
        highlightsImported++;
      }
    }

    // 2. Process conflicts according to chosen resolution
    for (const conflict of previewData.conflicts) {
      const resolution = conflictResolutions.get(conflict.incomingBook.id) || conflict.resolution;
      conflictsResolved++;

      if (resolution === 'skip') {
        continue;
      }

      if (resolution === 'replace') {
        let coverId: string | null = conflict.existingBook.coverId;

        if (conflict.incomingBook.coverFilename && previewData.coverBlobs.has(conflict.incomingBook.coverFilename)) {
          const blob = previewData.coverBlobs.get(conflict.incomingBook.coverFilename)!;
          if (coverId) {
            await db.coverImages.delete(coverId);
          }
          coverId = generateId();
          await db.coverImages.put({
            id: coverId,
            blob,
            mimeType: 'image/jpeg',
            originalSource: 'upload',
          });
        }

        const updatedBook: Book = {
          ...conflict.existingBook,
          title: conflict.incomingBook.title,
          author: conflict.incomingBook.author,
          genre: conflict.incomingBook.genre,
          year: conflict.incomingBook.year,
          tags: conflict.incomingBook.tags || [],
          coverId,
          folderId: conflict.incomingBook.folderId !== undefined ? conflict.incomingBook.folderId : conflict.existingBook.folderId,
          updatedAt: new Date().toISOString(),
        };

        await db.books.put(updatedBook);

        await db.highlights.where('bookId').equals(conflict.existingBook.id).delete();
        for (const h of conflict.incomingHighlights) {
          await db.highlights.put({
            ...h,
            id: generateId(),
            bookId: conflict.existingBook.id,
          });
          highlightsImported++;
        }
        booksImported++;
      }

      if (resolution === 'merge') {
        const existingBookHighlights = await db.highlights
          .where('bookId')
          .equals(conflict.existingBook.id)
          .toArray();

        if (
          !conflict.existingBook.coverId &&
          conflict.incomingBook.coverFilename &&
          previewData.coverBlobs.has(conflict.incomingBook.coverFilename)
        ) {
          const blob = previewData.coverBlobs.get(conflict.incomingBook.coverFilename)!;
          const newCoverId = generateId();
          await db.coverImages.put({
            id: newCoverId,
            blob,
            mimeType: 'image/jpeg',
            originalSource: 'upload',
          });
          await db.books.update(conflict.existingBook.id, { coverId: newCoverId });
        }

        if (conflict.incomingBook.folderId && !conflict.existingBook.folderId) {
          await db.books.update(conflict.existingBook.id, { folderId: conflict.incomingBook.folderId });
        }

        for (const incomingH of conflict.incomingHighlights) {
          const isDuplicate = existingBookHighlights.some(
            (ex) => normalizeString(ex.text) === normalizeString(incomingH.text)
          );
          if (!isDuplicate) {
            await db.highlights.put({
              ...incomingH,
              id: generateId(),
              bookId: conflict.existingBook.id,
            });
            highlightsImported++;
          }
        }
      }
    }
  });

  return { booksImported, highlightsImported, conflictsResolved };
}
