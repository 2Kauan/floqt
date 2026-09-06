import React from 'react';
import { Folder } from '../../types';
import { ChevronRight, BookOpen, Plus } from 'lucide-react';
import { Button } from '../common/Button';

export interface FolderBreadcrumbProps {
  breadcrumbs: Folder[];
  currentFolder: Folder | null;
  onNavigate: (folderId: string | null) => void;
  onNewFolder: () => void;
  onNewSubfolder: () => void;
  onDropToFolder?: (itemId: string, targetFolderId: string | null) => void;
}

export function FolderBreadcrumb({
  breadcrumbs,
  currentFolder,
  onNavigate,
  onNewFolder,
  onNewSubfolder,
  onDropToFolder,
}: FolderBreadcrumbProps) {
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [droppedId, setDroppedId] = React.useState<string | null>(null);

  const handleDropRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
    const bookId = e.dataTransfer.getData('application/floqt-book-id');
    const hlId = e.dataTransfer.getData('application/floqt-highlight-id');
    if ((bookId || hlId) && onDropToFolder) {
      setDroppedId('root');
      setTimeout(() => setDroppedId(null), 700);
      onDropToFolder(bookId || hlId, null);
    }
  };

  const handleDropFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const bookId = e.dataTransfer.getData('application/floqt-book-id');
    const hlId = e.dataTransfer.getData('application/floqt-highlight-id');
    if ((bookId || hlId) && onDropToFolder) {
      setDroppedId(folderId);
      setTimeout(() => setDroppedId(null), 700);
      onDropToFolder(bookId || hlId, folderId);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-border/70">
      {/* Breadcrumb Trail */}
      <nav aria-label="Hierarquia de Pastas" className="flex items-center flex-wrap gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onNavigate(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverId !== 'root') setDragOverId('root');
          }}
          onDragLeave={() => {
            if (dragOverId === 'root') setDragOverId(null);
          }}
          onDrop={handleDropRoot}
          className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md font-medium transition-all ${
            droppedId === 'root'
              ? 'animate-drop-absorb bg-accent text-white shadow-md'
              : dragOverId === 'root'
              ? 'animate-drag-pulse bg-accent/20 text-accent font-bold ring-2 ring-accent'
              : !currentFolder
              ? 'text-accent font-semibold bg-accent/10'
              : 'text-ink-muted hover:text-ink hover:bg-surface'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Início</span>
        </button>

        {breadcrumbs.map((folder, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const color = folder.color || '#FFA94D';
          const isDragTarget = dragOverId === folder.id;
          const isDroppedTarget = droppedId === folder.id;

          return (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-3.5 h-3.5 text-ink-muted/50 shrink-0" />
              <button
                type="button"
                onClick={() => onNavigate(folder.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== folder.id) setDragOverId(folder.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === folder.id) setDragOverId(null);
                }}
                onDrop={(e) => handleDropFolder(e, folder.id)}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md font-medium transition-all ${
                  isDroppedTarget
                    ? 'animate-drop-absorb bg-accent text-white shadow-md'
                    : isDragTarget
                    ? 'animate-drag-pulse bg-accent/20 text-accent font-bold ring-2 ring-accent'
                    : isLast
                    ? 'text-ink font-bold bg-surface border border-border shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isDroppedTarget ? '#FFFFFF' : color }}
                />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{folder.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Quick Action Button */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {currentFolder ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={onNewSubfolder}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs min-h-[32px] py-1 px-2.5"
          >
            Nova Subpasta
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onNewFolder}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs min-h-[32px] py-1 px-2.5"
          >
            Nova Pasta
          </Button>
        )}
      </div>
    </div>
  );
}
