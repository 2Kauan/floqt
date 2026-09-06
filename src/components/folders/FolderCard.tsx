import { useState, useRef, useEffect } from 'react';
import { Folder } from '../../types';
import { Folder as FolderIcon, MoreVertical, Edit2, Trash2, FolderPlus } from 'lucide-react';

export interface FolderCardProps {
  folder: Folder;
  itemCount: number;
  subfolderCount: number;
  itemLabel?: string;
  onClick: () => void;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onAddSubfolder: (folder: Folder) => void;
  onDropBook?: (bookId: string, folder: Folder) => void;
  onDropHighlight?: (highlightId: string, folder: Folder) => void;
}

export function FolderCard({
  folder,
  itemCount,
  subfolderCount,
  itemLabel = 'livro',
  onClick,
  onEdit,
  onDelete,
  onAddSubfolder,
  onDropBook,
  onDropHighlight,
}: FolderCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [justDropped, setJustDropped] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const bookId = e.dataTransfer.getData('application/floqt-book-id');
    const highlightId = e.dataTransfer.getData('application/floqt-highlight-id');

    if (bookId && onDropBook) {
      setJustDropped(true);
      setTimeout(() => setJustDropped(false), 700);
      onDropBook(bookId, folder);
      return;
    }

    if (highlightId && onDropHighlight) {
      setJustDropped(true);
      setTimeout(() => setJustDropped(false), 700);
      onDropHighlight(highlightId, folder);
    }
  };

  const folderColor = folder.color || '#FFA94D';

  return (
    <div
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative flex flex-col justify-between p-4 bg-surface rounded-xl shadow-sm transition-all duration-200 cursor-pointer overflow-hidden select-none animate-spring-pop ${
        justDropped
          ? 'animate-drop-absorb border-2 border-accent ring-4 ring-accent/40 bg-accent/15 scale-105 shadow-xl'
          : isDragOver
          ? 'border-2 border-accent animate-drag-pulse shadow-lg bg-accent/10'
          : 'border border-border/80 hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Subtle folder accent top border bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-opacity opacity-80 group-hover:opacity-100"
        style={{ backgroundColor: folderColor }}
      />

      {/* Card Header: Icon & Options Menu */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: folderColor }}
        >
          <FolderIcon className="w-5 h-5 fill-current" />
        </div>

        {/* Options Menu Button */}
        <div
          ref={menuRef}
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-bg/80 rounded-lg transition-colors"
            aria-label={`Opções da pasta ${folder.name}`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-xl shadow-lg py-1.5 z-20 animate-scale-up text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onAddSubfolder(folder);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-accent/10 hover:text-accent text-left transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Nova subpasta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit(folder);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-accent/10 hover:text-accent text-left transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar pasta</span>
              </button>

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete(folder);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 text-left transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir pasta</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div>
        <h3 className="font-serif font-bold text-sm text-ink line-clamp-1 group-hover:text-accent transition-colors">
          {folder.name}
        </h3>
        <p className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1.5">
          <span>{itemCount} {itemCount === 1 ? itemLabel : `${itemLabel}s`}</span>
          {subfolderCount > 0 && (
            <>
              <span>•</span>
              <span>{subfolderCount} {subfolderCount === 1 ? 'subpasta' : 'subpastas'}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
