import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmDeleteDialogProps {
  itemLabel: string;
  titleKey?: string;
  descriptionKey?: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string | null;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  itemLabel,
  titleKey,
  descriptionKey,
  deleting,
  onConfirm,
  onCancel,
  error,
}) => {
  const { t } = useLanguage();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the Cancel button on mount (safe default for destructive dialogs)
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Trap focus inside the dialog + handle ESC
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) {
        onCancel();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, deleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={t(titleKey || 'common.delete')}
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div ref={dialogRef} className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            {t(titleKey || 'common.delete')}
          </h3>
          <p className="text-sm text-gray-500">
            {descriptionKey
              ? t(descriptionKey)
              : `${t('common.confirmDeleteGeneric')} "${itemLabel}"?`}
          </p>
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? t('common.deleting') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
