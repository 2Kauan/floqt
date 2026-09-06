import JSZip from 'jszip';
import { db } from '../db/database';
import { ExportBookData, ExportData } from '../types';
import { updateLastExportAt } from './settingsService';
import { blobToBase64 } from '../utils/canvas';

export interface ExportResult {
  success: boolean;
  bookCount: number;
  highlightCount: number;
  zipBlob: Blob;
  downloadUrl: string;
  filename: string;
  jsonString: string;
  savedViaPicker?: boolean;
}

export async function prepareExportData(): Promise<{
  exportPayload: ExportData;
  books: ExportBookData[];
  highlights: any[];
  zipBlob: Blob;
  filename: string;
  jsonString: string;
}> {
  const [books, highlights, folders, settings] = await Promise.all([
    db.books.toArray(),
    db.highlights.toArray(),
    db.folders.toArray(),
    db.settings.get('singleton'),
  ]);

  const zip = new JSZip();
  const coversFolder = zip.folder('covers')!;
  const coversMap: Record<string, string> = {};

  const booksForExport: ExportBookData[] = await Promise.all(
    books.map(async (book) => {
      const { coverId, ...bookData } = book;
      let coverFilename: string | null = null;
      let coverBase64: string | null = null;

      if (coverId) {
        const cover = await db.coverImages.get(coverId);
        if (cover && cover.blob) {
          coverFilename = `${coverId}.jpg`;
          // Save binary image in zip folder
          coversFolder.file(coverFilename, cover.blob);

          // Also convert to base64 data URI for complete JSON portability
          try {
            coverBase64 = await blobToBase64(cover.blob);
            coversMap[coverFilename] = coverBase64;
          } catch {
            // Fallback silently if base64 conversion fails
          }
        }
      }

      return {
        ...bookData,
        coverFilename,
        coverBase64,
      };
    })
  );

  const exportPayload: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    folders,
    books: booksForExport,
    highlights,
    settings,
    covers: coversMap,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  zip.file('library.json', jsonString);

  const rawZipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const zipBlob = new Blob([rawZipBlob], { type: 'application/zip' });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `floqt-backup-${dateStr}.zip`;

  return {
    exportPayload,
    books: booksForExport,
    highlights,
    zipBlob,
    filename,
    jsonString,
  };
}

export async function exportLibrary(): Promise<ExportResult> {
  const { exportPayload, books, highlights, zipBlob, filename, jsonString } =
    await prepareExportData();

  const downloadUrl = URL.createObjectURL(zipBlob);
  await updateLastExportAt(exportPayload.exportedAt);

  return {
    success: true,
    bookCount: books.length,
    highlightCount: highlights.length,
    zipBlob,
    downloadUrl,
    filename,
    jsonString,
    savedViaPicker: false,
  };
}

export async function saveExportFile(exportResult: ExportResult): Promise<boolean> {
  const { zipBlob, filename, downloadUrl } = exportResult;

  // 1. Try modern File System Access API (User chooses folder directly)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Backup FLOQT (.zip)',
            accept: {
              'application/zip': ['.zip'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(zipBlob);
      await writable.close();
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled directory picker
        return false;
      }
      // Fallback if failed
    }
  }

  // 2. Standard browser download fallback
  try {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = downloadUrl;
    link.download = filename;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
    return true;
  } catch {
    return false;
  }
}
