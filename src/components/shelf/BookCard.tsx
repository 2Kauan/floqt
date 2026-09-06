import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book } from '../../types';
import { CoverPlaceholder } from './CoverPlaceholder';
import { useCoverImage } from '../../hooks/useCoverImage';
import { Quote } from 'lucide-react';

export interface BookCardProps {
  book: Book;
  highlightCount: number;
}

export function BookCard({ book, highlightCount }: BookCardProps) {
  const { coverUrl } = useCoverImage(book.coverId);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/floqt-book-id', book.id);
    e.dataTransfer.setData('text/plain', book.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Link
      to={`/books/${book.id}`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group flex flex-col focus:outline-none animate-fade-in-up cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100'
      }`}
      aria-label={`${book.title}${book.author ? ` por ${book.author}` : ''}, ${highlightCount} destaques (arraste para mover para uma pasta)`}
    >
      <div className="relative w-full aspect-2/3 rounded-md overflow-hidden shadow-cover group-hover:shadow-xl group-hover:-translate-y-1.5 group-hover:scale-[1.02] transition-all duration-300 ease-out bg-surface border border-border/50 group-hover:border-accent/30">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa de ${book.title}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none"
          />
        ) : (
          <CoverPlaceholder title={book.title} />
        )}

        {/* Highlights count badge with subtle backdrop */}
        {highlightCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-ink/80 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full shadow-sm group-hover:bg-accent group-hover:text-white transition-colors duration-200">
            <Quote className="w-2.5 h-2.5 fill-current" />
            <span>{highlightCount}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-col">
        <h3 className="text-sm font-serif font-semibold text-ink line-clamp-2 leading-tight group-hover:text-accent transition-colors duration-200">
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-ink-muted line-clamp-1 mt-0.5">
            {book.author}
          </p>
        )}
      </div>
    </Link>
  );
}
