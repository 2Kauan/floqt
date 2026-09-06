import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHighlights } from '../hooks/useHighlights';
import { useBooks } from '../hooks/useBooks';
import { Highlight, Book } from '../types';
import { deleteHighlight, reorderHighlights } from '../services/highlightService';
import { HighlightFormModal } from '../components/highlights/HighlightFormModal';
import { HighlightExpandedModal } from '../components/highlights/HighlightExpandedModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/date';
import { useToastStore } from '../store/useToastStore';
import {
  Quote,
  Search,
  X,
  Shuffle,
  BookOpen,
  Tag as TagIcon,
  Copy,
  Check,
  Edit3,
  Trash2,
  Maximize2,
  MessageSquare,
  ArrowUpDown,
  Filter,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

export function MuralPage() {
  const navigate = useNavigate();
  const { highlights, isLoading: isLoadingHighlights } = useHighlights();
  const { books } = useBooks();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'custom' | 'recent' | 'oldest' | 'book'>('custom');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reorder mode state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedList, setReorderedList] = useState<Highlight[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isReorderMode) {
      setReorderedList(highlights);
    }
  }, [highlights, isReorderMode]);

  // Modals state
  const [expandedHighlight, setExpandedHighlight] = useState<Highlight | null>(null);
  const [highlightToEdit, setHighlightToEdit] = useState<Highlight | null>(null);
  const [highlightToDelete, setHighlightToDelete] = useState<Highlight | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Book map for fast lookup
  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) {
      map.set(b.id, b);
    }
    return map;
  }, [books]);

  // Unique tags from all highlights
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const h of highlights) {
      for (const t of h.tags || []) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return Array.from(set).sort();
  }, [highlights]);

  // Filtered & Sorted highlights
  const filteredHighlights = useMemo(() => {
    let result = [...highlights];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((h) => {
        const book = bookMap.get(h.bookId);
        const bookTitle = book ? book.title.toLowerCase() : '';
        const bookAuthor = book ? book.author.toLowerCase() : '';
        return (
          h.text.toLowerCase().includes(q) ||
          (h.comment && h.comment.toLowerCase().includes(q)) ||
          (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
          bookTitle.includes(q) ||
          bookAuthor.includes(q)
        );
      });
    }

    // Tag filter
    if (selectedTag) {
      result = result.filter(
        (h) => h.tags && h.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
      );
    }

    // Book filter
    if (selectedBookId) {
      result = result.filter((h) => h.bookId === selectedBookId);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'book') {
        const titleA = bookMap.get(a.bookId)?.title || '';
        const titleB = bookMap.get(b.bookId)?.title || '';
        return titleA.localeCompare(titleB, 'pt-BR');
      }
      // 'custom': Order by order field
      const hasOrderA = typeof a.order === 'number';
      const hasOrderB = typeof b.order === 'number';
      if (hasOrderA && hasOrderB) {
        return (a.order as number) - (b.order as number);
      }
      if (hasOrderA) return -1;
      if (hasOrderB) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [highlights, searchQuery, selectedTag, selectedBookId, sortBy, bookMap]);

  // Random quote of the day / shuffle
  const handleRandomQuote = () => {
    if (highlights.length === 0) return;
    const randomIndex = Math.floor(Math.random() * highlights.length);
    setExpandedHighlight(highlights[randomIndex]);
  };

  const handleCopyQuote = async (highlight: Highlight, e: React.MouseEvent) => {
    e.stopPropagation();
    const parentBook = bookMap.get(highlight.bookId);
    let copyString = `“${highlight.text}”`;
    if (parentBook) {
      copyString += `\n— ${parentBook.author ? `${parentBook.author}, ` : ''}《${parentBook.title}》`;
      if (highlight.page) {
        copyString += ` (p. ${highlight.page})`;
      }
    }

    try {
      await navigator.clipboard.writeText(copyString);
      setCopiedId(highlight.id);
      addToast({
        type: 'success',
        message: 'Citação copiada para a área de transferência!',
      });
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao copiar citação.',
      });
    }
  };

  const handleDeleteHighlight = async () => {
    if (!highlightToDelete) return;
    try {
      setIsDeleting(true);
      await deleteHighlight(highlightToDelete.id);
      addToast({
        type: 'success',
        message: 'Destaque excluído.',
      });
      if (expandedHighlight?.id === highlightToDelete.id) {
        setExpandedHighlight(null);
      }
      setHighlightToDelete(null);
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao excluir destaque.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleReorder = async () => {
    if (isReorderMode) {
      try {
        const ids = reorderedList.map((h) => h.id);
        await reorderHighlights(ids);
        setSortBy('custom');
        addToast({
          type: 'success',
          message: 'Ordem do mural salva com sucesso!',
        });
      } catch {
        addToast({
          type: 'error',
          message: 'Erro ao salvar a nova ordem.',
        });
      }
      setIsReorderMode(false);
    } else {
      setSortBy('custom');
      setReorderedList([...highlights]);
      setIsReorderMode(true);
      setSearchQuery('');
      setSelectedTag(null);
      setSelectedBookId(null);
    }
  };

  const moveHighlight = async (fromIdx: number, toIdx: number) => {
    if (
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= reorderedList.length ||
      toIdx >= reorderedList.length
    )
      return;
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
      e.dataTransfer.setData('application/floqt-reorder-idx', String(idx));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rawIdx =
      e.dataTransfer.getData('application/floqt-reorder-idx') ||
      e.dataTransfer.getData('text/plain');
    const fromIdx =
      draggingIdx !== null ? draggingIdx : parseInt(rawIdx, 10);

    if (isNaN(fromIdx) || fromIdx === toIdx) {
      setDraggingIdx(null);
      return;
    }
    await moveHighlight(fromIdx, toIdx);
    setDraggingIdx(null);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

  const activeFiltersCount =
    (selectedTag ? 1 : 0) + (selectedBookId ? 1 : 0) + (searchQuery ? 1 : 0);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag(null);
    setSelectedBookId(null);
  };

  if (isLoadingHighlights) {
    return <div className="p-12 text-center text-ink-muted">Carregando mural...</div>;
  }

  const displayList = isReorderMode ? reorderedList : filteredHighlights;

  return (
    <div className="flex flex-col space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight flex items-center gap-2.5">
            <Quote className="w-6 h-6 text-accent fill-accent/20 shrink-0" />
            <span>Mural Literário</span>
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {highlights.length === 0
              ? 'Nenhum destaque salvo ainda'
              : highlights.length === 1
              ? '1 destaque marcado na sua biblioteca'
              : `${highlights.length} destaques e reflexões marcadas`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {highlights.length >= 2 && (
            <Button
              size="sm"
              variant={isReorderMode ? 'primary' : 'secondary'}
              onClick={handleToggleReorder}
              leftIcon={
                isReorderMode ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <GripVertical className="w-3.5 h-3.5 text-accent" />
                )
              }
            >
              {isReorderMode ? 'Concluir Ordem' : 'Reordenar Mural'}
            </Button>
          )}

          {highlights.length > 0 && !isReorderMode && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRandomQuote}
              leftIcon={<Shuffle className="w-3.5 h-3.5 text-accent" />}
            >
              Sortear Citação
            </Button>
          )}
        </div>
      </div>

      {/* Reorder Mode Helper Banner */}
      {isReorderMode && (
        <div className="p-3.5 bg-accent/10 border border-accent/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-accent text-white shrink-0">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <p>
              <strong>Modo de Reordenação do Mural:</strong> Segure e arraste os cards ou use as setas para posicionar as citações na ordem que desejar.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={handleToggleReorder} className="self-end sm:self-auto shrink-0">
            Salvar Ordem
          </Button>
        </div>
      )}

      {/* Main Search & Filter Bar (hidden when reordering) */}
      {!isReorderMode && highlights.length > 0 && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar em todas as frases, notas, autores ou livros..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar pesquisa"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium mr-1">
                <Filter className="w-3.5 h-3.5 text-accent" />
                <span>Filtrar</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </div>

              {/* Book filter */}
              {books.length > 0 && (
                <select
                  value={selectedBookId || ''}
                  onChange={(e) => setSelectedBookId(e.target.value || null)}
                  aria-label="Filtrar por livro"
                  className="text-xs bg-surface border border-border text-ink rounded-lg px-2.5 py-1.5 outline-none focus:border-accent cursor-pointer"
                >
                  <option value="">Todos os Livros</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Tag filter */}
              {availableTags.length > 0 && (
                <select
                  value={selectedTag || ''}
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  aria-label="Filtrar por tag"
                  className="text-xs bg-surface border border-border text-ink rounded-lg px-2.5 py-1.5 outline-none focus:border-accent cursor-pointer"
                >
                  <option value="">Todas as Tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      #{tag}
                    </option>
                  ))}
                </select>
              )}

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'custom' | 'recent' | 'oldest' | 'book')
                }
                aria-label="Ordenar mural"
                className="text-xs bg-surface border border-border text-ink rounded-lg px-2.5 py-1.5 outline-none focus:border-accent cursor-pointer"
              >
                <option value="custom">Ordem personalizada</option>
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="book">Por livro (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {highlights.length === 0 ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <EmptyState
            icon={<Quote className="w-8 h-8" />}
            title="Seu Mural está vazio"
            description={
              books.length === 0
                ? "Adicione seu primeiro livro na estante para começar a colecionar seus destaques e frases favoritas."
                : "Quando você destacar trechos e frases nos seus livros, todas elas aparecerão organizadas neste mural contínuo de leitura."
            }
            actionLabel="Ir para a Estante"
            onAction={() => navigate('/')}
          />
        </div>
      ) : displayList.length === 0 ? (
        <div className="p-12 bg-surface border border-border rounded-xl text-center">
          <p className="text-base font-serif font-semibold text-ink mb-1">
            Nenhuma frase encontrada
          </p>
          <p className="text-xs text-ink-muted mb-4">
            Tente buscar por outras palavras ou limpar os filtros ativos.
          </p>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        /* Grid of Quotes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayList.map((h, idx) => {
            const parentBook = bookMap.get(h.bookId);
            const isCopied = copiedId === h.id;
            const isDragging = draggingIdx === idx;

            return (
              <article
                key={h.id}
                draggable={isReorderMode}
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(idx, e)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  if (!isReorderMode) {
                    setExpandedHighlight(h);
                  }
                }}
                className={`group relative p-5 bg-surface border rounded-2xl shadow-2xs transition-all duration-150 flex flex-col justify-between select-none ${
                  isDragging
                    ? 'opacity-40 scale-95 border-dashed border-accent bg-accent/5'
                    : isReorderMode
                    ? 'border-accent/40 hover:border-accent cursor-grab active:cursor-grabbing hover:bg-surface/90 shadow-sm'
                    : 'border-border hover:shadow-md hover:border-accent/40 cursor-pointer'
                }`}
              >
                <div>
                  {/* Book Context Header / Reorder Handle */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isReorderMode && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20 shrink-0">
                          <GripVertical className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>#{idx + 1}</span>
                        </span>
                      )}

                      {parentBook && (
                        <Link
                          to={`/books/${parentBook.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent font-medium line-clamp-1 group/link"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="line-clamp-1">{parentBook.title}</span>
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isReorderMode ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveHighlight(idx, idx - 1)}
                            aria-label="Mover para cima"
                            className="p-1 rounded bg-bg border border-border text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === displayList.length - 1}
                            onClick={() => moveHighlight(idx, idx + 1)}
                            aria-label="Mover para baixo"
                            className="p-1 rounded bg-bg border border-border text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        h.page && (
                          <span className="text-[10px] bg-bg border border-border text-ink-muted font-semibold px-2 py-0.5 rounded-full shrink-0">
                            p. {h.page}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Serif Quote Text */}
                  <blockquote className="text-base font-serif text-ink italic leading-relaxed line-clamp-6 mb-3">
                    “{h.text}”
                  </blockquote>

                  {/* Personal Comment Snippet */}
                  {h.comment && (
                    <div className="flex items-start gap-2 text-xs text-ink-muted bg-bg/70 p-2.5 rounded-lg border border-border/60 mb-3 font-sans">
                      <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-relaxed">{h.comment}</p>
                    </div>
                  )}
                </div>

                <div>
                  {/* Tags */}
                  {h.tags && h.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {h.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-ink-muted"
                        >
                          <TagIcon className="w-2.5 h-2.5" />
                          <span>#{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Bottom Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50 text-[11px] text-ink-muted">
                    <span>{formatDate(h.createdAt)}</span>

                    {!isReorderMode && (
                      <div
                        className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleCopyQuote(h, e)}
                          title="Copiar citação"
                          aria-label="Copiar citação"
                          className="p-1.5 rounded-md hover:bg-bg text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedHighlight(h)}
                          title="Expandir citação"
                          aria-label="Expandir citação"
                          className="p-1.5 rounded-md hover:bg-bg text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setHighlightToEdit(h)}
                          title="Editar"
                          aria-label="Editar destaque"
                          className="p-1.5 rounded-md hover:bg-bg text-ink-muted hover:text-ink transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setHighlightToDelete(h)}
                          title="Excluir"
                          aria-label="Excluir destaque"
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-ink-muted hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Expanded Quote Modal */}
      <HighlightExpandedModal
        isOpen={Boolean(expandedHighlight)}
        highlight={expandedHighlight}
        book={expandedHighlight ? bookMap.get(expandedHighlight.bookId) : null}
        onClose={() => setExpandedHighlight(null)}
        onEdit={(h) => {
          setExpandedHighlight(null);
          setHighlightToEdit(h);
        }}
        onDelete={(h) => {
          setHighlightToDelete(h);
        }}
      />

      {/* Highlight Form Modal */}
      {highlightToEdit && (
        <HighlightFormModal
          isOpen={Boolean(highlightToEdit)}
          bookId={highlightToEdit.bookId}
          highlightToEdit={highlightToEdit}
          onClose={() => setHighlightToEdit(null)}
        />
      )}

      {/* Confirm Delete Modal */}
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
    </div>
  );
}
