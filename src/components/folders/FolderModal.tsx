import React, { useState, useEffect } from 'react';
import { X, Folder as FolderIcon, Check, Palette } from 'lucide-react';
import { Button } from '../common/Button';
import { Folder } from '../../types';
import {
  SAMSUNG_FOLDER_COLORS,
  DEFAULT_FOLDER_COLOR,
  createFolder,
  updateFolder,
  getFlattenedFolderTree,
} from '../../services/folderService';
import { useFolders, useHighlightFolders } from '../../hooks/useFolders';
import { useToastStore } from '../../store/useToastStore';

export interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: Folder | null;
  defaultParentId?: string | null;
  bookId?: string | null;
  type?: 'book' | 'highlight';
  onSuccess?: (folder: Folder) => void;
}

export function FolderModal({
  isOpen,
  onClose,
  folderToEdit,
  defaultParentId = null,
  bookId = null,
  type = 'book',
  onSuccess,
}: FolderModalProps) {
  const { folders: bookFolders } = useFolders();
  const { folders: hlFolders } = useHighlightFolders(bookId || undefined);
  const activeFolders = bookId ? hlFolders : bookFolders;

  const { addToast } = useToastStore();

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(folderToEdit);
  const isCustomColor = !SAMSUNG_FOLDER_COLORS.some(
    (c) => c.value.toLowerCase() === color.toLowerCase()
  );

  useEffect(() => {
    if (isOpen) {
      if (folderToEdit) {
        setName(folderToEdit.name);
        setParentId(folderToEdit.parentId);
        setColor(folderToEdit.color || DEFAULT_FOLDER_COLOR);
      } else {
        setName('');
        setParentId(defaultParentId);
        setColor(DEFAULT_FOLDER_COLOR);
      }
      setError('');
    }
  }, [isOpen, folderToEdit, defaultParentId]);

  if (!isOpen) return null;

  const folderOptions = getFlattenedFolderTree(activeFolders, folderToEdit?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da pasta é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && folderToEdit) {
        const updated = await updateFolder(folderToEdit.id, {
          name,
          parentId,
          color,
        });
        addToast({
          type: 'success',
          message: `Pasta "${updated.name}" atualizada com sucesso.`,
        });
        onSuccess?.(updated);
      } else {
        const created = await createFolder({
          name,
          parentId,
          color,
          bookId,
          type,
        });
        addToast({
          type: 'success',
          message: `Pasta "${created.name}" criada com sucesso.`,
        });
        onSuccess?.(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar a pasta.');
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
        aria-labelledby="folder-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <FolderIcon className="w-4 h-4 fill-current" />
            </div>
            <h2 id="folder-modal-title" className="text-lg font-serif font-bold text-ink">
              {isEditing ? 'Editar Pasta' : defaultParentId ? 'Nova Subpasta' : 'Nova Pasta'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          {/* Name Input */}
          <div>
            <label htmlFor="folder-name" className="block text-xs font-semibold text-ink mb-1">
              Nome da Pasta <span className="text-destructive">*</span>
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="ex: Filosofia, Ficção, Trabalho..."
              autoFocus
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>

          {/* Parent Folder Selector */}
          <div>
            <label htmlFor="parent-folder" className="block text-xs font-semibold text-ink mb-1">
              Localização (Pasta Pai)
            </label>
            <select
              id="parent-folder"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value ? e.target.value : null)}
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
            >
              <option value="">Início da Estante (Raiz)</option>
              {folderOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.depth > 0 ? `${'\u00A0\u00A0'.repeat(opt.depth)}└─ ` : ''}{opt.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-muted mt-1">
              {parentId ? 'Esta pasta será criada como uma subpasta.' : 'Esta pasta ficará na raiz da estante.'}
            </p>
          </div>

          {/* Color Selection (Presets + Custom Color Picker) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="custom-color-input" className="block text-xs font-semibold text-ink">
                Cor da Pasta
              </label>
              <span className="text-[11px] font-mono text-ink-muted uppercase">
                {color}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {SAMSUNG_FOLDER_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    aria-label={`Selecionar cor ${c.name}`}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-accent scale-110 shadow-md'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                );
              })}

              {/* Custom Color Picker Button */}
              <label
                className={`relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all border border-border shadow-sm overflow-hidden ${
                  isCustomColor
                    ? 'ring-2 ring-offset-2 ring-accent scale-110'
                    : 'hover:scale-105 hover:border-ink-muted'
                }`}
                style={{
                  backgroundColor: isCustomColor ? color : 'transparent',
                  background: isCustomColor
                    ? color
                    : 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFA500 45deg, #FFFF00 90deg, #008000 135deg, #0000FF 225deg, #800080 315deg, #FF0000 360deg)',
                }}
                title="Escolher cor personalizada"
              >
                <input
                  id="custom-color-input"
                  type="color"
                  value={color.startsWith('#') && color.length === 7 ? color : '#FFA94D'}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Escolher cor personalizada"
                />
                {isCustomColor ? (
                  <Check className="w-4 h-4 text-white drop-shadow relative z-10 pointer-events-none" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-surface/80 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                    <Palette className="w-3 h-3 text-ink" />
                  </div>
                )}
              </label>
            </div>

            {/* Custom Hex Input */}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs text-ink-muted">Personalizada:</span>
              <div className="relative flex-1 max-w-[140px]">
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('#') && val.length > 0) {
                      val = '#' + val;
                    }
                    setColor(val);
                  }}
                  placeholder="#FFA94D"
                  maxLength={7}
                  className="w-full bg-bg border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent uppercase"
                />
              </div>
              <span className="text-[11px] text-ink-muted">
                {isCustomColor ? '(Cor personalizada ativa)' : '(Paleta rápida)'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {isEditing ? 'Salvar Alterações' : 'Criar Pasta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
