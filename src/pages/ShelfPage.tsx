import { useState, useMemo } from 'react';
import { useBooks } from '../hooks/useBooks';
import { useFolders } from '../hooks/useFolders';
import { useHighlightCounts } from '../hooks/useHighlights';
import { BookCard } from '../components/shelf/BookCard';
import { ShelfHeader } from '../components/shelf/ShelfHeader';
import { BookCardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { FolderBreadcrumb } from '../components/folders/FolderBreadcrumb';
import { FolderCard } from '../components/folders/FolderCard';
import { FolderModal } from '../components/folders/FolderModal';
import { MoveBookModal } from '../components/folders/MoveBookModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { BookOpen, SearchX, Folder as FolderIcon, FolderPlus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Folder, Book } from '../types';
import { deleteFolder } from '../services/folderService';
import { useToastStore } from '../store/useToastStore';
import { Button } from '../components/common/Button';

export function ShelfPage() {
  const navigate = useNavigate();
  const { books, isLoading: isLoadingBooks } = useBooks();
  const { folders, folderCounts, getBreadcrumbs, getSubfolders } = useFolders();
  const highlightCounts = useHighlightCounts();
  const { addToast } = useToastStore();

  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Folder Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  // Delete Folder Modal
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Move Book Modal
  const [bookToMove, setBookToMove] = useState<Book | null>(null);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  const currentFolder = useMemo(
    () => folders.find((f) => f.id === currentFolderId) || null,
    [folders, currentFolderId]
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(currentFolderId),
    [getBreadcrumbs, currentFolderId]
  );

  const currentSubfolders = useMemo(
    () => getSubfolders(currentFolderId),
    [getSubfolders, currentFolderId]
  );

  const isSearching = Boolean(searchQuery.trim());

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // If not actively searching, only show books belonging to current folder (or root if null)
    if (!isSearching) {
      result = result.filter((b) => (b.folderId || null) === currentFolderId);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Default sorting by recent
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [books, searchQuery, currentFolderId, isSearching]);

  const handleDropBookToFolder = async (bookId: string, targetFolderId: string | null) => {
    try {
      const { moveBookToFolder } = await import('../services/folderService');
      await moveBookToFolder(bookId, targetFolderId);
      const targetFolder = folders.find((f) => f.id === targetFolderId);
      addToast({
        type: 'success',
        message: targetFolder
          ? `Livro movido para "${targetFolder.name}".`
          : 'Livro movido para o início da estante.',
      });
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao mover o livro.',
      });
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      setIsDeletingFolder(true);
      await deleteFolder(folderToDelete.id);
      addToast({
        type: 'success',
        message: `Pasta "${folderToDelete.name}" excluída. Livros foram movidos para a estante.`,
      });
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(folderToDelete.parentId || null);
      }
      setFolderToDelete(null);
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao excluir a pasta.',
      });
    } finally {
      setIsDeletingFolder(false);
    }
  };

  if (isLoadingBooks) {
    return (
      <div className="flex flex-col">
        <div className="h-8 w-40 bg-ink/10 rounded-md mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Zero-state: no books or folders created yet
  if (books.length === 0 && folders.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="Sua estante está vazia"
          description="Adicione seu primeiro livro ou organize suas leituras criando pastas temáticas."
          actionLabel="Adicionar primeiro livro"
          onAction={() => navigate('/books/new')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <ShelfHeader
        totalBooks={books.length}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      {/* Breadcrumbs & New Folder/Subfolder Actions */}
      <FolderBreadcrumb
        breadcrumbs={breadcrumbs}
        currentFolder={currentFolder}
        onNavigate={(folderId) => setCurrentFolderId(folderId)}
        onDropToFolder={(bookId, targetFolderId) => handleDropBookToFolder(bookId, targetFolderId)}
        onNewFolder={() => {
          setFolderToEdit(null);
          setDefaultParentId(null);
          setIsFolderModalOpen(true);
        }}
        onNewSubfolder={() => {
          setFolderToEdit(null);
          setDefaultParentId(currentFolderId);
          setIsFolderModalOpen(true);
        }}
      />

      {/* Subfolders Section (only visible when not searching) */}
      {!isSearching && currentSubfolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-serif font-bold text-ink">
                {currentFolder ? 'Subpastas' : 'Pastas'}
              </h2>
              <span className="text-[11px] bg-bg border border-border px-2 py-0.5 rounded-full text-ink-muted">
                {currentSubfolders.length}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted hidden sm:block">
              Dica: Arraste e solte um livro sobre a pasta para movê-lo.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {currentSubfolders.map((folder) => {
              const counts = folderCounts.get(folder.id) || { bookCount: 0, subfolderCount: 0 };
              return (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  itemCount={counts.bookCount}
                  subfolderCount={counts.subfolderCount}
                  itemLabel="livro"
                  onClick={() => setCurrentFolderId(folder.id)}
                  onDropBook={(bookId, f) => handleDropBookToFolder(bookId, f.id)}
                  onEdit={(f) => {
                    setFolderToEdit(f);
                    setIsFolderModalOpen(true);
                  }}
                  onDelete={(f) => setFolderToDelete(f)}
                  onAddSubfolder={(f) => {
                    setFolderToEdit(null);
                    setDefaultParentId(f.id);
                    setIsFolderModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Books Section */}
      <div className="space-y-3">
        {!isSearching && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-ink-muted" />
              <h2 className="text-sm font-serif font-bold text-ink">
                {currentFolder ? `Livros em ${currentFolder.name}` : 'Livros'}
              </h2>
              <span className="text-[11px] bg-bg border border-border px-2 py-0.5 rounded-full text-ink-muted">
                {filteredAndSortedBooks.length}
              </span>
            </div>

            {currentFolder && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/books/new')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Adicionar livro nesta pasta
              </Button>
            )}
          </div>
        )}

        {filteredAndSortedBooks.length === 0 ? (
          <div className="py-12 px-4 bg-surface/50 border border-dashed border-border rounded-2xl text-center">
            {isSearching ? (
              <EmptyState
                icon={<SearchX className="w-8 h-8" />}
                title="Nenhum livro encontrado"
                description="Não encontramos nenhum livro com o termo de busca aplicado."
                actionLabel="Limpar busca"
                onAction={() => setSearchQuery('')}
              />
            ) : currentSubfolders.length > 0 ? (
              <p className="text-xs text-ink-muted">
                Nenhum livro direto nesta pasta. Navegue pelas subpastas acima ou adicione um livro aqui.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-ink-muted">
                  {currentFolder
                    ? `A pasta "${currentFolder.name}" está vazia.`
                    : 'Nenhum livro na raiz da estante.'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/books/new')}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Adicionar Livro
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setFolderToEdit(null);
                      setDefaultParentId(currentFolderId);
                      setIsFolderModalOpen(true);
                    }}
                    leftIcon={<FolderPlus className="w-3.5 h-3.5" />}
                  >
                    {currentFolder ? 'Criar Subpasta' : 'Criar Pasta'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {filteredAndSortedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                highlightCount={highlightCounts.get(book.id) || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Folder Create/Edit Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        folderToEdit={folderToEdit}
        defaultParentId={defaultParentId}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
          setDefaultParentId(null);
        }}
      />

      {/* Delete Folder Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleDeleteFolder}
        title={`Excluir pasta "${folderToDelete?.name}"?`}
        message="Deseja realmente excluir esta pasta? Todas as subpastas serão excluídas, e os livros serão mantidos e movidos para o início da estante."
        confirmLabel="Excluir Pasta"
        isDestructive={true}
        isLoading={isDeletingFolder}
      />

      {/* Move Book Modal */}
      <MoveBookModal
        isOpen={Boolean(bookToMove)}
        book={bookToMove}
        onClose={() => setBookToMove(null)}
      />
    </div>
  );
}

