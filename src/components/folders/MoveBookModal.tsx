import { useState, useEffect } from 'react';
import { X, Folder as FolderIcon, Check, BookOpen } from 'lucide-react';
import { Button } from '../common/Button';
import { Book } from '../../types';
import { useFolders } from '../../hooks/useFolders';
import { moveBookToFolder } from '../../services/folderService';
import { useToastStore } from '../../store/useToastStore';

export interface MoveBookModalProps {
  isOpen: boolean;
  book: Book | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveBookModal({
  isOpen,
  book,
  onClose,
  onSuccess,
}: MoveBookModalProps) {
  const { folders, getFolderTree } = useFolders();
  const { addToast } = useToastStore();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && book) {
      setSelectedFolderId(book.folderId || null);
    }
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const folderOptions = getFolderTree();

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await moveBookToFolder(book.id, selectedFolderId);
      const targetFolder = folders.find((f) => f.id === selectedFolderId);
      addToast({
        type: 'success',
        message: targetFolder
          ? `Livro movido para "${targetFolder.name}".`
          : 'Livro movido para o Início da Estante.',
      });
      onSuccess?.();
      onClose();
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao mover o livro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5 text-accent" />
            <h2 id="move-modal-title" className="text-lg font-serif font-bold text-ink">
              Mover para Pasta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-bg rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-ink-muted mt-3 mb-4 line-clamp-1">
          Selecione o destino para <strong>"{book.title}"</strong>:
        </p>

        {/* Folder Selection List */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 border border-border/70 rounded-xl bg-bg/50">
          {/* Root Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              selectedFolderId === null
                ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                : 'text-ink hover:bg-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-ink-muted" />
              <span>Início da Estante (Sem pasta)</span>
            </div>
            {selectedFolderId === null && <Check className="w-4 h-4 text-accent" />}
          </button>

          {/* Hierarchical Folders */}
          {folderOptions.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const color = folder.color || '#FFA94D';

            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                    : 'text-ink hover:bg-surface'
                }`}
                style={{ paddingLeft: `${Math.max(12, 12 + folder.depth * 16)}px` }}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{folder.name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSave} isLoading={isSubmitting}>
            Mover Livro
          </Button>
        </div>
      </div>
    </div>
  );
}
