import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TagInput } from '../common/TagInput';
import { Highlight } from '../../types';
import { createHighlight, updateHighlight } from '../../services/highlightService';
import { useHighlightFolders } from '../../hooks/useFolders';
import { useToastStore } from '../../store/useToastStore';
import { Folder as FolderIcon } from 'lucide-react';

export interface HighlightFormModalProps {
  isOpen: boolean;
  bookId: string;
  highlightToEdit?: Highlight | null;
  defaultFolderId?: string | null;
  onClose: () => void;
  onSaved?: (highlight: Highlight) => void;
}

export function HighlightFormModal({
  isOpen,
  bookId,
  highlightToEdit,
  defaultFolderId = null,
  onClose,
  onSaved,
}: HighlightFormModalProps) {
  const isEditing = Boolean(highlightToEdit);
  const { addToast } = useToastStore();
  const { getFolderTree } = useHighlightFolders(bookId);

  const [text, setText] = useState('');
  const [page, setPage] = useState<string>('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (highlightToEdit) {
      setText(highlightToEdit.text);
      setPage(highlightToEdit.page ? highlightToEdit.page.toString() : '');
      setComment(highlightToEdit.comment || '');
      setTags(highlightToEdit.tags || []);
      setFolderId(highlightToEdit.folderId || null);
    } else {
      setText('');
      setPage('');
      setComment('');
      setTags([]);
      setFolderId(defaultFolderId);
    }
    setErrors({});
  }, [highlightToEdit, defaultFolderId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!text.trim()) {
      newErrors.text = 'A frase ou trecho é obrigatório.';
    } else if (text.trim().length > 5000) {
      newErrors.text = 'O trecho não pode ter mais de 5000 caracteres.';
    }

    if (comment.trim().length > 2000) {
      newErrors.comment = 'O comentário não pode ter mais de 2000 caracteres.';
    }

    const pageNum = page ? parseInt(page, 10) : null;
    if (page && (isNaN(pageNum!) || pageNum! < 1)) {
      newErrors.page = 'Informe um número de página válido.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSaving(true);
      let saved: Highlight;

      if (isEditing && highlightToEdit) {
        saved = await updateHighlight(highlightToEdit.id, {
          text,
          page: pageNum,
          comment: comment || null,
          tags,
          folderId,
        });
        addToast({
          type: 'success',
          message: 'Destaque atualizado com sucesso.',
        });
      } else {
        saved = await createHighlight({
          bookId,
          text,
          page: pageNum,
          comment: comment || null,
          tags,
          folderId,
        });
        addToast({
          type: 'success',
          message: 'Destaque adicionado ao livro.',
        });
      }

      if (onSaved) onSaved(saved);
      onClose();
    } catch {
      addToast({
        type: 'error',
        message: 'Erro ao salvar o destaque. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const folderOptions = getFolderTree();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Destaque' : 'Novo Destaque'}
      description="Capture a passagem marcada e suas impressões pessoais."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Quote / Highlight Text */}
        <div>
          <label htmlFor="highlight-text" className="block text-sm font-medium text-ink mb-1">
            Frase ou Trecho Marcado <span className="text-destructive">*</span>
          </label>
          <textarea
            id="highlight-text"
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (errors.text) setErrors((prev) => ({ ...prev, text: '' }));
            }}
            placeholder="Digite ou cole aqui a frase que você marcou no livro..."
            aria-required="true"
            aria-invalid={Boolean(errors.text)}
            className={`w-full bg-bg/50 border rounded-lg p-3 text-base font-serif text-ink outline-none transition-colors resize-y leading-relaxed ${
              errors.text
                ? 'border-destructive focus:ring-1 focus:ring-destructive'
                : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
            }`}
          />
          {errors.text && (
            <p className="text-xs text-destructive mt-1">{errors.text}</p>
          )}
        </div>

        {/* Folder Selection */}
        {folderOptions.length > 0 && (
          <div>
            <label htmlFor="highlight-folder" className="block text-xs font-semibold text-ink mb-1 flex items-center gap-1.5">
              <FolderIcon className="w-3.5 h-3.5 text-accent" />
              <span>Pasta do Destaque</span>
            </label>
            <select
              id="highlight-folder"
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value ? e.target.value : null)}
              className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
            >
              <option value="">Raiz do Livro (Sem pasta)</option>
              {folderOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.depth > 0 ? `${'\u00A0\u00A0'.repeat(f.depth)}└─ ` : ''}{f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Page */}
          <div>
            <label htmlFor="highlight-page" className="block text-sm font-medium text-ink mb-1">
              Página (opcional)
            </label>
            <input
              id="highlight-page"
              type="number"
              min="1"
              value={page}
              onChange={(e) => {
                setPage(e.target.value);
                if (errors.page) setErrors((prev) => ({ ...prev, page: '' }));
              }}
              placeholder="ex: 142"
              className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            {errors.page && (
              <p className="text-xs text-destructive mt-1">{errors.page}</p>
            )}
          </div>

          {/* Tags */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1">
              Tags do Destaque
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="ex: amor, morte, citação..."
            />
          </div>
        </div>

        {/* Personal Reflection / Margin Note */}
        <div>
          <label htmlFor="highlight-comment" className="block text-sm font-medium text-ink mb-1">
            Reflexão / Anotação Pessoal (opcional)
          </label>
          <textarea
            id="highlight-comment"
            rows={2}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (errors.comment) setErrors((prev) => ({ ...prev, comment: '' }));
            }}
            placeholder="O que este trecho te fez pensar ou sentir?"
            className="w-full bg-bg/50 border border-border rounded-lg p-3 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
          />
          {errors.comment && (
            <p className="text-xs text-destructive mt-1">{errors.comment}</p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Salvar Alterações' : 'Salvar Destaque'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
