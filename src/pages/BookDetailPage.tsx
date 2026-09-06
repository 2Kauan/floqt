import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBook } from '../hooks/useBooks';
import { useFolder, useHighlightFolders } from '../hooks/useFolders';
import { useHighlights } from '../hooks/useHighlights';
import { useCoverImage } from '../hooks/useCoverImage';
import { deleteBook } from '../services/bookService';
import { deleteHighlight, reorderHighlights } from '../services/highlightService';
import { deleteFolder, moveHighlightToFolder } from '../services/folderService';
import { CoverPlaceholder } from '../components/shelf/CoverPlaceholder';
import { HighlightCard } from '../components/highlights/HighlightCard';
import { HighlightFormModal } from '../components/highlights/HighlightFormModal';
import { HighlightExpandedModal } from '../components/highlights/HighlightExpandedModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { MoveBookModal } from '../components/folders/MoveBookModal';
import { MoveHighlightModal } from '../components/folders/MoveHighlightModal';
import { FolderModal } from '../components/folders/FolderModal';
import { FolderBreadcrumb } from '../components/folders/FolderBreadcrumb';
import { FolderCard } from '../components/folders/FolderCard';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { useToastStore } from '../store/useToastStore';
import { Highlight, Folder } from '../types';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Search,
  X,
  Quote,
  Calendar,
  Bookmark,
  Tag as TagIcon,
  GripVertical,
  Check,
  Folder as FolderIcon,
  FolderInput,
  FolderPlus,
} from 'lucide-react';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const { book, isLoading: isLoadingBook } = useBook(id);
  const { folder } = useFolder(book?.folderId);
  const { highlights } = useHighlights(id);
  const { coverUrl } = useCoverImage(book?.coverId);

  // Highlight Folders state
  const {
    folders: hlFolders,
    highlightFolderCounts,
    getBreadcrumbs: getHlBreadcrumbs,
    getSubfolders: getHlSubfolders,
  } = useHighlightFolders(book?.id);

  const [currentHlFolderId, setCurrentHlFolderId] = useState<string | null>(null);

  // Highlight Folder Modals
  const [isHlFolderModalOpen, setIsHlFolderModalOpen] = useState(false);
  const [hlFolderToEdit, setHlFolderToEdit] = useState<Folder | null>(null);
  const [defaultHlParentId, setDefaultHlParentId] = useState<string | null>(null);
  const [hlFolderToDelete, setHlFolderToDelete] = useState<Folder | null>(null);
  const [isDeletingHlFolder, setIsDeletingHlFolder] = useState(false);

  // Search inside this book's highlights
  const [searchQuery, setSearchQuery] = useState('');

  // Reorder mode state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedList, setReorderedList] = useState<Highlight[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [highlightToEdit, setHighlightToEdit] = useState<Highlight | null>(null);
  const [isMoveFolderOpen, setIsMoveFolderOpen] = useState(false);
  const [highlightToMove, setHighlightToMove] = useState<Highlight | null>(null);

  const [expandedHighlight, setExpandedHighlight] = useState<Highlight | null>(null);

  const [highlightToDelete, setHighlightToDelete] = useState<Highlight | null>(null);
  const [isDeleteBookOpen, setIsDeleteBookOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentHlFolder = useMemo(
    () => hlFolders.find((f) => f.id === currentHlFolderId) || null,
    [hlFolders, currentHlFolderId]
  );

  const hlBreadcrumbs = useMemo(
    () => getHlBreadcrumbs(currentHlFolderId),
    [getHlBreadcrumbs, currentHlFolderId]
  );

  const currentHlSubfolders = useMemo(
    () => getHlSubfolders(currentHlFolderId),
    [getHlSubfolders, currentHlFolderId]
  );

  const isSearchingHighlights = Boolean(searchQuery.trim());

  // Filter highlights by active highlight folder (unless searching)
  const filteredHighlights = useMemo(() => {
    let result = [...highlights];

    if (!isSearchingHighlights) {
      result = result.filter((h) => (h.folderId || null) === currentHlFolderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (h) =>
          h.text.toLowerCase().includes(q) ||
          (h.comment && h.comment.toLowerCase().includes(q)) ||
          (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
          (h.page && h.page.toString().includes(q))
      );
    }

    return result;
  }, [highlights, searchQuery, currentHlFolderId, isSearchingHighlights]);

  useEffect(() => {
    if (!isReorderMode) {
      setReorderedList(filteredHighlights);
    }
  }, [filteredHighlights, isReorderMode]);

  if (isLoadingBook) {
    return <div className="p-12 text-center text-ink-muted">Carregando livro...</div>;
  }

  if (!book) {
    return (
      <div className="py-16">
        <EmptyState
          title="Livro não encontrado"
          description="Este livro não foi encontrado ou pode ter sido excluído."
          actionLabel="Voltar para a Estante"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const handleDeleteBook = async () => {
    try {
      setIsDeleting(true);
      await deleteBook(book.id);
      addToast({
        type: 'success',
        message: `Livro "${book.title}" e seus destaques foram excluídos.`,
      });
      navigate('/');
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao excluir o livro.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteHighlight = async () => {
    if (!highlightToDelete) return;
    try {
      setIsDeleting(true);
      await deleteHighlight(highlightToDelete.id);
      addToast({
        type: 'success',
        message: 'Destaque excluído com sucesso.',
      });
      if (expandedHighlight?.id === highlightToDelete.id) {
        setExpandedHighlight(null);
      }
      setHighlightToDelete(null);
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao excluir o destaque.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteHlFolder = async () => {
    if (!hlFolderToDelete) return;
    try {
      setIsDeletingHlFolder(true);
      await deleteFolder(hlFolderToDelete.id);
      addToast({
        type: 'success',
        message: `Pasta "${hlFolderToDelete.name}" excluída. Destaques foram movidos para a raiz do livro.`,
      });
      if (currentHlFolderId === hlFolderToDelete.id) {
        setCurrentHlFolderId(hlFolderToDelete.parentId || null);
      }
      setHlFolderToDelete(null);
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao excluir a pasta de destaques.',
      });
    } finally {
      setIsDeletingHlFolder(false);
    }
  };

  const handleDropHighlightToFolder = async (highlightId: string, targetFolderId: string | null) => {
    try {
      await moveHighlightToFolder(highlightId, targetFolderId);
      const targetFolder = hlFolders.find((f) => f.id === targetFolderId);
      addToast({
        type: 'success',
        message: targetFolder
          ? `Destaque movido para "${targetFolder.name}".`
          : 'Destaque movido para a raiz do livro.',
      });
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao mover o destaque.',
      });
    }
  };

  const handleToggleReorder = async () => {
    if (isReorderMode) {
      try {
        const ids = reorderedList.map((h) => h.id);
        await reorderHighlights(ids);
        addToast({
          type: 'success',
          message: 'Ordem dos destaques salva com sucesso!',
        });
      } catch {
        addToast({
          type: 'error',
          message: 'Erro ao salvar a nova ordem.',
        });
      }
      setIsReorderMode(false);
    } else {
      setReorderedList([...filteredHighlights]);
      setIsReorderMode(true);
      setSearchQuery('');
    }
  };

  const moveHighlight = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= reorderedList.length) return;
    const updated = [...reorderedList];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setReorderedList(updated);
    try {
      await reorderHighlights(updated.map((h) => h.id));
    } catch {}
  };

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(idx));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === toIdx) {
      setDraggingIdx(null);
      return;
    }
    await moveHighlight(draggingIdx, toIdx);
    setDraggingIdx(null);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

  const displayList = isReorderMode ? reorderedList : filteredHighlights;

  return (
    <div className="flex flex-col space-y-8 pb-12 animate-fade-in-up">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors font-medium py-1 px-2 -ml-2 rounded-md hover:bg-surface"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Estante</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMoveFolderOpen(true)}
            leftIcon={<FolderInput className="w-3.5 h-3.5 text-accent" />}
            className="text-xs min-h-[36px]"
          >
            Mover Pasta
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/books/${book.id}/edit`)}
            leftIcon={<Edit className="w-3.5 h-3.5" />}
            className="text-xs min-h-[36px]"
          >
            Editar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteBookOpen(true)}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
            className="text-destructive hover:bg-destructive/10 text-xs min-h-[36px]"
          >
            Excluir
          </Button>
        </div>
      </div>

      {/* Book Metadata & Hero Section */}
      <div className="p-6 sm:p-8 bg-surface border border-border rounded-2xl shadow-sm flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
        {/* Cover 2:3 */}
        <div className="w-36 sm:w-44 aspect-2/3 shrink-0 rounded-lg overflow-hidden shadow-cover bg-bg">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Capa de ${book.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <CoverPlaceholder title={book.title} />
          )}
        </div>

        {/* Book Details */}
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink leading-tight mb-1">
            {book.title}
          </h1>

          {book.author && (
            <p className="text-base text-ink-muted font-serif mb-4">
              por <span className="font-semibold text-ink">{book.author}</span>
            </p>
          )}

          {/* Meta Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4 text-xs text-ink-muted">
            {/* Folder Badge */}
            <button
              type="button"
              onClick={() => setIsMoveFolderOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg border border-border hover:border-accent/40 text-ink transition-colors cursor-pointer"
              title="Clique para mover o livro de pasta"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: folder?.color || '#868E96' }}
              />
              <span className="font-medium">{folder ? folder.name : 'Início da Estante'}</span>
            </button>

            {book.genre && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg border border-border text-ink">
                <Bookmark className="w-3 h-3 text-accent" />
                <span>{book.genre}</span>
              </span>
            )}

            {book.year && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg border border-border text-ink">
                <Calendar className="w-3 h-3 text-accent" />
                <span>{book.year}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
              <Quote className="w-3 h-3" />
              <span>{highlights.length} {highlights.length === 1 ? 'destaque' : 'destaques'}</span>
            </span>
          </div>

          {/* Book Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-bg text-ink-muted border border-border"
                >
                  <TagIcon className="w-2.5 h-2.5" />
                  <span>#{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Highlights Section */}
      <div className="flex flex-col space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-ink">
              Destaques Literários
            </h2>
            <span className="text-xs bg-bg border border-border px-2 py-0.5 rounded-full text-ink-muted">
              {filteredHighlights.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {filteredHighlights.length >= 2 && (
              <Button
                variant={isReorderMode ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleToggleReorder}
                leftIcon={
                  isReorderMode ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <GripVertical className="w-4 h-4 text-accent" />
                  )
                }
              >
                {isReorderMode ? 'Concluir Ordem' : 'Reordenar'}
              </Button>
            )}

            {!isReorderMode && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setHighlightToEdit(null);
                  setIsFormOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Novo Destaque
              </Button>
            )}
          </div>
        </div>

        {/* Highlight Folders Breadcrumb */}
        {(hlFolders.length > 0 || currentHlFolderId) && (
          <FolderBreadcrumb
            breadcrumbs={hlBreadcrumbs}
            currentFolder={currentHlFolder}
            onNavigate={(folderId) => setCurrentHlFolderId(folderId)}
            onDropToFolder={(hlId, targetFolderId) => handleDropHighlightToFolder(hlId, targetFolderId)}
            onNewFolder={() => {
              setHlFolderToEdit(null);
              setDefaultHlParentId(null);
              setIsHlFolderModalOpen(true);
            }}
            onNewSubfolder={() => {
              setHlFolderToEdit(null);
              setDefaultHlParentId(currentHlFolderId);
              setIsHlFolderModalOpen(true);
            }}
          />
        )}

        {/* Highlight Folders/Subfolders Grid */}
        {!isSearchingHighlights && currentHlSubfolders.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-serif font-bold text-ink">
                  {currentHlFolder ? 'Subpastas de Destaques' : 'Pastas de Destaques'}
                </span>
                <span className="text-[10px] bg-bg border border-border px-1.5 py-0.2 rounded-full text-ink-muted">
                  {currentHlSubfolders.length}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted hidden sm:block">
                Arraste um destaque para soltá-lo na pasta desejada.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentHlSubfolders.map((folder) => {
                const counts = highlightFolderCounts.get(folder.id) || { highlightCount: 0, subfolderCount: 0 };
                return (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    itemCount={counts.highlightCount}
                    subfolderCount={counts.subfolderCount}
                    itemLabel="destaque"
                    onClick={() => setCurrentHlFolderId(folder.id)}
                    onDropHighlight={(hlId, f) => handleDropHighlightToFolder(hlId, f.id)}
                    onEdit={(f) => {
                      setHlFolderToEdit(f);
                      setIsHlFolderModalOpen(true);
                    }}
                    onDelete={(f) => setHlFolderToDelete(f)}
                    onAddSubfolder={(f) => {
                      setHlFolderToEdit(null);
                      setDefaultHlParentId(f.id);
                      setIsHlFolderModalOpen(true);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Reorder Mode Helper Banner */}
        {isReorderMode && (
          <div className="p-3.5 bg-accent/10 border border-accent/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-accent text-white shrink-0">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <p>
                <strong>Modo de Reordenação:</strong> Segure e arraste os cards ou use as setas para ordenar livremente.
              </p>
            </div>
            <Button size="sm" variant="primary" onClick={handleToggleReorder} className="self-end sm:self-auto shrink-0">
              Salvar Ordem
            </Button>
          </div>
        )}

        {/* Search within highlights */}
        {!isReorderMode && highlights.length > 2 && (
          <div className="relative w-full">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar nos trechos deste livro..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2 text-xs text-ink placeholder:text-ink-muted/70 outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Highlights List or Empty State */}
        {highlights.length === 0 && hlFolders.length === 0 ? (
          <div className="p-8 bg-surface border border-border rounded-xl">
            <EmptyState
              icon={<Quote className="w-8 h-8" />}
              title="Nenhum destaque ainda"
              description="Adicione frases, trechos marcantes ou crie pastas para organizar as anotações deste livro."
              actionLabel="Adicionar primeiro destaque"
              onAction={() => {
                setHighlightToEdit(null);
                setIsFormOpen(true);
              }}
            />
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-8 bg-surface border border-border rounded-xl text-center space-y-3">
            <p className="text-sm text-ink-muted">
              {isSearchingHighlights
                ? `Nenhum trecho encontrado com "${searchQuery}".`
                : currentHlFolder
                ? `Nenhum destaque direto na pasta "${currentHlFolder.name}".`
                : 'Nenhum destaque encontrado nesta visualização.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {isSearchingHighlights ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                >
                  Limpar busca
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setHighlightToEdit(null);
                      setIsFormOpen(true);
                    }}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Novo Destaque
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setHlFolderToEdit(null);
                      setDefaultHlParentId(currentHlFolderId);
                      setIsHlFolderModalOpen(true);
                    }}
                    leftIcon={<FolderPlus className="w-3.5 h-3.5" />}
                  >
                    {currentHlFolder ? 'Nova Subpasta' : 'Nova Pasta de Destaques'}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayList.map((highlight, idx) => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                index={idx}
                isReorderMode={isReorderMode}
                onMoveUp={() => moveHighlight(idx, idx - 1)}
                onMoveDown={() => moveHighlight(idx, idx + 1)}
                canMoveUp={idx > 0}
                canMoveDown={idx < displayList.length - 1}
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(idx, e)}
                onDragEnd={handleDragEnd}
                isDragging={draggingIdx === idx}
                onExpand={(h) => setExpandedHighlight(h)}
                onEdit={(h) => {
                  setHighlightToEdit(h);
                  setIsFormOpen(true);
                }}
                onDelete={(h) => setHighlightToDelete(h)}
                onMoveFolder={(h) => setHighlightToMove(h)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight Form Modal */}
      <HighlightFormModal
        isOpen={isFormOpen}
        bookId={book.id}
        highlightToEdit={highlightToEdit}
        defaultFolderId={currentHlFolderId}
        onClose={() => {
          setIsFormOpen(false);
          setHighlightToEdit(null);
        }}
      />

      {/* Highlight Expanded Typographic Modal */}
      <HighlightExpandedModal
        isOpen={Boolean(expandedHighlight)}
        highlight={expandedHighlight}
        book={book}
        onClose={() => setExpandedHighlight(null)}
        onEdit={(h) => {
          setExpandedHighlight(null);
          setHighlightToEdit(h);
          setIsFormOpen(true);
        }}
        onDelete={(h) => {
          setHighlightToDelete(h);
        }}
      />

      {/* Confirm Delete Highlight Modal */}
      <ConfirmModal
        isOpen={Boolean(highlightToDelete)}
        onClose={() => setHighlightToDelete(null)}
        onConfirm={handleDeleteHighlight}
        title="Excluir Destaque"
        message="Deseja realmente excluir este destaque permanentemente?"
        confirmLabel="Excluir"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* Confirm Delete Book Modal */}
      <ConfirmModal
        isOpen={isDeleteBookOpen}
        onClose={() => setIsDeleteBookOpen(false)}
        onConfirm={handleDeleteBook}
        title={`Excluir "${book.title}"?`}
        message={`Deseja realmente excluir este livro? Todos os ${highlights.length} destaques e a capa serão removidos permanentemente.`}
        confirmLabel="Excluir Livro"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* Move Book Modal */}
      <MoveBookModal
        isOpen={isMoveFolderOpen}
        book={book}
        onClose={() => setIsMoveFolderOpen(false)}
      />

      {/* Move Highlight Modal */}
      <MoveHighlightModal
        isOpen={Boolean(highlightToMove)}
        highlight={highlightToMove}
        bookId={book.id}
        onClose={() => setHighlightToMove(null)}
      />

      {/* Highlight Folder Create/Edit Modal */}
      <FolderModal
        isOpen={isHlFolderModalOpen}
        folderToEdit={hlFolderToEdit}
        defaultParentId={defaultHlParentId}
        bookId={book.id}
        type="highlight"
        onClose={() => {
          setIsHlFolderModalOpen(false);
          setHlFolderToEdit(null);
          setDefaultHlParentId(null);
        }}
      />

      {/* Delete Highlight Folder Modal */}
      <ConfirmModal
        isOpen={Boolean(hlFolderToDelete)}
        onClose={() => setHlFolderToDelete(null)}
        onConfirm={handleDeleteHlFolder}
        title={`Excluir pasta de destaques "${hlFolderToDelete?.name}"?`}
        message="Deseja realmente excluir esta pasta? Todas as subpastas serão excluídas, e os destaques serão mantidos na raiz do livro."
        confirmLabel="Excluir Pasta"
        isDestructive={true}
        isLoading={isDeletingHlFolder}
      />
    </div>
  );
}
