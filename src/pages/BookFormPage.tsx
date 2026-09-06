import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, Camera, Sparkles, Trash2, Check, RefreshCw, AlertCircle, Folder as FolderIcon } from 'lucide-react';
import { useBook, useBooks } from '../hooks/useBooks';
import { useFolders } from '../hooks/useFolders';
import { createBook, updateBook } from '../services/bookService';
import { saveCoverImage, searchCoverByTitle, searchCoverByIsbn } from '../services/coverService';
import { useCoverImage } from '../hooks/useCoverImage';
import { CoverPlaceholder } from '../components/shelf/CoverPlaceholder';
import { TagInput } from '../components/common/TagInput';
import { Button } from '../components/common/Button';
import { ImageCropperModal } from '../components/book/ImageCropperModal';
import { useToastStore } from '../store/useToastStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const isOnline = useOnlineStatus();
  const { genres: existingGenres } = useBooks();
  const { getFolderTree } = useFolders();

  const { book, isLoading: isLoadingBook } = useBook(id);
  const { coverUrl: existingCoverUrl } = useCoverImage(book?.coverId);

  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isbn, setIsbn] = useState('');

  // Cover image states
  const [selectedCoverBlob, setSelectedCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [hasRemovedExistingCover, setHasRemovedExistingCover] = useState(false);

  // Auto search state
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [autoFoundCoverBlob, setAutoFoundCoverBlob] = useState<Blob | null>(null);
  const [autoFoundCoverUrl, setAutoFoundCoverUrl] = useState<string | null>(null);
  const [autoSearchFailed, setAutoSearchFailed] = useState(false);

  // Cropper state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [rawBlobForCrop, setRawBlobForCrop] = useState<Blob | null>(null);

  // Submission state
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const lastSearchedTitleRef = useRef<string>('');

  // Populate data in edit mode
  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author || '');
      setGenre(book.genre || '');
      setYear(book.year ? book.year.toString() : '');
      setTags(book.tags || []);
      setFolderId(book.folderId || null);
    }
  }, [book]);

  // Handle auto cover search on title input
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: '' }));
    }

    if (!isOnline || isEditing || selectedCoverBlob || coverPreviewUrl) {
      return;
    }

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    const cleanTitle = newTitle.trim();
    if (cleanTitle.length >= 3 && cleanTitle !== lastSearchedTitleRef.current) {
      searchTimeoutRef.current = window.setTimeout(async () => {
        lastSearchedTitleRef.current = cleanTitle;
        setIsSearchingCover(true);
        setAutoSearchFailed(false);
        try {
          const blob = await searchCoverByTitle(cleanTitle);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setAutoFoundCoverBlob(blob);
            setAutoFoundCoverUrl(url);
          } else {
            setAutoSearchFailed(true);
          }
        } catch {
          setAutoSearchFailed(true);
        } finally {
          setIsSearchingCover(false);
        }
      }, 800);
    }
  };

  // Trigger search by ISBN
  const handleIsbnSearch = async () => {
    if (!isbn.trim() || !isOnline) return;
    setIsSearchingCover(true);
    setAutoSearchFailed(false);
    try {
      const blob = await searchCoverByIsbn(isbn);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setAutoFoundCoverBlob(blob);
        setAutoFoundCoverUrl(url);
      } else {
        setAutoSearchFailed(true);
      }
    } catch {
      setAutoSearchFailed(true);
    } finally {
      setIsSearchingCover(false);
    }
  };

  // Handle file selection from gallery or camera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (10MB max)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        cover: 'Formato inválido. Use JPEG, PNG ou WebP.',
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        cover: 'A imagem não pode ultrapassar 10MB.',
      }));
      return;
    }

    setRawBlobForCrop(file);
    const objectUrl = URL.createObjectURL(file);
    setCropSourceUrl(objectUrl);
    setIsCropperOpen(true);
    // Reset file input
    e.target.value = '';
  };

  const handleCropConfirmed = (croppedBlob: Blob) => {
    setSelectedCoverBlob(croppedBlob);
    const url = URL.createObjectURL(croppedBlob);
    setCoverPreviewUrl(url);
    setAutoFoundCoverBlob(null);
    setAutoFoundCoverUrl(null);
    setHasRemovedExistingCover(false);
  };

  const handleAcceptAutoCover = () => {
    if (autoFoundCoverBlob && autoFoundCoverUrl) {
      setSelectedCoverBlob(autoFoundCoverBlob);
      setCoverPreviewUrl(autoFoundCoverUrl);
      setAutoFoundCoverBlob(null);
      setAutoFoundCoverUrl(null);
      setHasRemovedExistingCover(false);
    }
  };

  const handleRemoveCover = () => {
    setSelectedCoverBlob(null);
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
    setAutoFoundCoverBlob(null);
    setAutoFoundCoverUrl(null);
    setHasRemovedExistingCover(true);
  };

  // Save Book
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'O título do livro é obrigatório.';
    } else if (title.trim().length > 200) {
      newErrors.title = 'O título não pode ter mais de 200 caracteres.';
    }

    if (author.trim().length > 150) {
      newErrors.author = 'O autor não pode ter mais de 150 caracteres.';
    }

    if (genre.trim().length > 80) {
      newErrors.genre = 'O gênero não pode ter mais de 80 caracteres.';
    }

    const yearNum = year ? parseInt(year, 10) : null;
    if (year && (isNaN(yearNum!) || yearNum! < 1000 || yearNum! > 2099)) {
      newErrors.year = 'Informe um ano válido entre 1000 e 2099.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSaving(true);
      let coverIdToSave: string | null | undefined = undefined;

      if (selectedCoverBlob) {
        coverIdToSave = await saveCoverImage(selectedCoverBlob, 'upload');
      } else if (hasRemovedExistingCover) {
        coverIdToSave = null;
      }

      if (isEditing && book) {
        await updateBook(book.id, {
          title,
          author,
          genre: genre || null,
          year: yearNum,
          tags,
          coverId: coverIdToSave,
          folderId,
        });
        addToast({
          type: 'success',
          message: 'Livro atualizado com sucesso.',
        });
        navigate(`/books/${book.id}`);
      } else {
        const newBook = await createBook({
          title,
          author,
          genre: genre || null,
          year: yearNum,
          tags,
          coverId: coverIdToSave ?? null,
          folderId,
        });
        addToast({
          type: 'success',
          message: 'Livro adicionado à sua estante.',
        });
        navigate(`/books/${newBook.id}`);
      }
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao salvar o livro. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoadingBook) {
    return <div className="p-8 text-center text-ink-muted">Carregando livro...</div>;
  }

  const activeDisplayCoverUrl =
    coverPreviewUrl || (hasRemovedExistingCover ? null : existingCoverUrl);

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={isEditing && book ? `/books/${book.id}` : '/'}
          className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface border border-border transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-serif font-bold text-ink">
          {isEditing ? 'Editar Livro' : 'Adicionar Livro'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Cover Section */}
        <div className="p-5 bg-surface border border-border rounded-xl">
          <label className="block text-sm font-semibold font-serif text-ink mb-3">
            Capa do Livro
          </label>

          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Cover Preview 2:3 */}
            <div className="w-32 aspect-2/3 shrink-0 rounded-md overflow-hidden shadow-cover bg-bg flex items-center justify-center border border-border relative">
              {activeDisplayCoverUrl ? (
                <img
                  src={activeDisplayCoverUrl}
                  alt={`Preview da capa de ${title || 'livro'}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <CoverPlaceholder title={title || 'Novo Livro'} />
              )}
            </div>

            {/* Cover Actions */}
            <div className="flex-1 flex flex-col justify-between space-y-3 w-full">
              <p className="text-xs text-ink-muted leading-relaxed">
                Ao digitar o título, buscamos a capa automaticamente. Você também pode enviar uma foto da capa ou usar o placeholder tipográfico.
              </p>

              {/* Auto Cover Search Indicator */}
              {isSearchingCover && (
                <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 p-2.5 rounded-lg">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Buscando capa na Open Library...</span>
                </div>
              )}

              {/* Auto Cover Found Prompt */}
              {autoFoundCoverUrl && (
                <div className="p-3 bg-bg/80 border border-accent/30 rounded-lg flex flex-col gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-accent">
                    <Sparkles className="w-4 h-4" />
                    <span>Capa encontrada automaticamente!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleAcceptAutoCover}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                    >
                      Usar esta capa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAutoFoundCoverBlob(null);
                        setAutoFoundCoverUrl(null);
                      }}
                    >
                      Ignorar
                    </Button>
                  </div>
                </div>
              )}

              {autoSearchFailed && !activeDisplayCoverUrl && (
                <div className="flex items-center gap-2 text-xs text-ink-muted bg-bg p-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Capa não encontrada automaticamente. Adicione uma imagem manualmente.</span>
                </div>
              )}

              {/* Upload Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  id="gallery-upload"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  id="camera-upload"
                />

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Escolher foto
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => cameraInputRef.current?.click()}
                  leftIcon={<Camera className="w-3.5 h-3.5" />}
                  className="sm:hidden"
                >
                  Câmera
                </Button>

                {activeDisplayCoverUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveCover}
                    leftIcon={<Trash2 className="w-3.5 h-3.5 text-destructive" />}
                  >
                    Remover capa
                  </Button>
                )}
              </div>

              {/* Optional ISBN Search */}
              {!activeDisplayCoverUrl && isOnline && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Buscar por ISBN (ex: 978...)"
                    className="text-xs bg-bg border border-border rounded-lg px-2.5 py-1.5 flex-1 outline-none focus:border-accent"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleIsbnSearch}
                    disabled={!isbn.trim() || isSearchingCover}
                  >
                    Buscar
                  </Button>
                </div>
              )}

              {errors.cover && (
                <p className="text-xs text-destructive mt-1">{errors.cover}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-5 bg-surface border border-border rounded-xl space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="book-title" className="block text-sm font-medium text-ink mb-1">
              Título do Livro <span className="text-destructive">*</span>
            </label>
            <input
              id="book-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="ex: Memórias Póstumas de Brás Cubas"
              aria-required="true"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className={`w-full bg-bg/50 border rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none transition-colors ${
                errors.title
                  ? 'border-destructive focus:ring-1 focus:ring-destructive'
                  : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
              }`}
            />
            {errors.title && (
              <p id="title-error" className="text-xs text-destructive mt-1">
                {errors.title}
              </p>
            )}
          </div>

          {/* Author */}
          <div>
            <label htmlFor="book-author" className="block text-sm font-medium text-ink mb-1">
              Autor(a)
            </label>
            <input
              id="book-author"
              type="text"
              value={author}
              onChange={(e) => {
                setAuthor(e.target.value);
                if (errors.author) setErrors((prev) => ({ ...prev, author: '' }));
              }}
              placeholder="ex: Machado de Assis"
              className="w-full bg-bg/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            {errors.author && (
              <p className="text-xs text-destructive mt-1">{errors.author}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Genre */}
            <div>
              <label htmlFor="book-genre" className="block text-sm font-medium text-ink mb-1">
                Gênero
              </label>
              <input
                id="book-genre"
                type="text"
                list="genre-suggestions"
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  if (errors.genre) setErrors((prev) => ({ ...prev, genre: '' }));
                }}
                placeholder="ex: Romance, Filosofia..."
                className="w-full bg-bg/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              <datalist id="genre-suggestions">
                {existingGenres.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            {/* Publication Year */}
            <div>
              <label htmlFor="book-year" className="block text-sm font-medium text-ink mb-1">
                Ano de Publicação
              </label>
              <input
                id="book-year"
                type="number"
                min="1000"
                max="2099"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  if (errors.year) setErrors((prev) => ({ ...prev, year: '' }));
                }}
                placeholder="ex: 1881"
                className="w-full bg-bg/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
              {errors.year && (
                <p className="text-xs text-destructive mt-1">{errors.year}</p>
              )}
            </div>
          </div>

          {/* Folder Selection */}
          <div>
            <label htmlFor="book-folder" className="block text-sm font-medium text-ink mb-1 flex items-center gap-1.5">
              <FolderIcon className="w-4 h-4 text-accent" />
              <span>Pasta / Organização</span>
            </label>
            <select
              id="book-folder"
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
              className="w-full bg-bg/50 border border-border rounded-lg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
            >
              <option value="">Início da Estante (Sem pasta)</option>
              {getFolderTree().map((f) => (
                <option key={f.id} value={f.id}>
                  {f.depth > 0 ? `${'\u00A0\u00A0'.repeat(f.depth)}└─ ` : ''}{f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Tags do Livro
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="ex: clássicos, favoritos, releitura..."
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => navigate(isEditing && book ? `/books/${book.id}` : '/')}
            disabled={isSaving}
          >
            Cancelar
          </Button>

          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Salvar Alterações' : 'Salvar Livro'}
          </Button>
        </div>
      </form>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropSourceUrl}
        rawBlob={rawBlobForCrop}
        onCropConfirmed={handleCropConfirmed}
        onClose={() => {
          setIsCropperOpen(false);
          if (cropSourceUrl) {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl(null);
          }
          setRawBlobForCrop(null);
        }}
      />
    </div>
  );
}
