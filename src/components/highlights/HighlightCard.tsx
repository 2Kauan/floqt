import React, { useState } from 'react';
import { Highlight } from '../../types';
import { formatDate } from '../../utils/date';
import {
  MoreVertical,
  Edit3,
  Trash2,
  Maximize2,
  Tag,
  MessageSquare,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FolderInput,
} from 'lucide-react';

export interface HighlightCardProps {
  highlight: Highlight;
  onExpand: (highlight: Highlight) => void;
  onEdit: (highlight: Highlight) => void;
  onDelete: (highlight: Highlight) => void;
  onMoveFolder?: (highlight: Highlight) => void;
  isReorderMode?: boolean;
  index?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function HighlightCard({
  highlight,
  onExpand,
  onEdit,
  onDelete,
  onMoveFolder,
  isReorderMode = false,
  index,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
}: HighlightCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSelfDragging, setIsSelfDragging] = useState(false);

  const handleSelfDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/floqt-highlight-id', highlight.id);
    e.dataTransfer.setData('text/plain', highlight.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsSelfDragging(true);
    onDragStart?.(e);
  };

  const handleSelfDragEnd = (e: React.DragEvent) => {
    setIsSelfDragging(false);
    onDragEnd?.(e);
  };

  return (
    <article
      draggable={true}
      onDragStart={handleSelfDragStart}
      onDragOver={onDragOver}
      onDragEnd={handleSelfDragEnd}
      onDrop={onDrop}
      onClick={() => {
        if (!isReorderMode) {
          onExpand(highlight);
        }
      }}
      className={`group relative p-5 bg-surface border rounded-xl shadow-2xs transition-all duration-200 ease-out flex flex-col justify-between select-none ${
        isDragging || isSelfDragging
          ? 'opacity-40 scale-95 border-dashed border-accent bg-accent/5'
          : isReorderMode
          ? 'border-accent/40 hover:border-accent shadow-sm cursor-grab active:cursor-grabbing hover:bg-surface/90'
          : 'border-border hover:shadow-md hover:-translate-y-0.5 hover:border-accent/40 cursor-grab active:cursor-grabbing animate-fade-in-up'
      }`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {isReorderMode && typeof index === 'number' ? (
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                <GripVertical className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>#{index + 1}</span>
              </div>
            ) : null}

            {highlight.page ? (
              <span className="text-[11px] font-semibold tracking-wide bg-bg border border-border text-ink-muted px-2 py-0.5 rounded-md group-hover:border-accent/30 transition-colors">
                Pág. {highlight.page}
              </span>
            ) : (
              <span className="text-[11px] text-ink-muted/70 italic">Sem página</span>
            )}

            <span className="text-[11px] text-ink-muted">
              {formatDate(highlight.createdAt)}
            </span>
          </div>

          {/* Reorder Up/Down arrows or Standard Menu */}
          {isReorderMode ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={onMoveUp}
                aria-label="Mover para cima"
                className="p-1 rounded bg-bg border border-border text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Mover para cima"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={onMoveDown}
                aria-label="Mover para baixo"
                className="p-1 rounded bg-bg border border-border text-ink-muted hover:text-ink hover:border-accent disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="Mover para baixo"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Opções do destaque"
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-bg transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-lg shadow-lg py-1 z-30 animate-pop-in">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onExpand(highlight);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-bg transition-colors text-left cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Expandir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(highlight);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-bg transition-colors text-left cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    {onMoveFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onMoveFolder(highlight);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-bg transition-colors text-left cursor-pointer"
                      >
                        <FolderInput className="w-3.5 h-3.5 text-accent" />
                        <span>Mover para pasta</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(highlight);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Quote Content */}
        <blockquote className="text-base font-serif text-ink leading-relaxed line-clamp-6 italic mb-3 group-hover:text-accent transition-colors duration-200">
          “{highlight.text}”
        </blockquote>

        {/* Personal Comment Snippet */}
        {highlight.comment && (
          <div className="flex items-start gap-2 text-xs text-ink-muted bg-bg/60 p-2.5 rounded-lg border border-border/60 mb-3 group-hover:border-accent/20 transition-colors">
            <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">{highlight.comment}</p>
          </div>
        )}
      </div>

      {/* Tags */}
      {highlight.tags && highlight.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-border/50">
          {highlight.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-bg border border-border text-ink-muted group-hover:border-accent/30 transition-colors"
            >
              <Tag className="w-2.5 h-2.5" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
