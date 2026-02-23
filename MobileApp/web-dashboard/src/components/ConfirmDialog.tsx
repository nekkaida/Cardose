import React, { useRef, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const resolvedConfirmLabel = confirmLabel || t('common.confirm') || 'Confirm';
  const resolvedCancelLabel = cancelLabel || t('common.cancel') || 'Cancel';

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel} initialFocus={cancelRef}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
                <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    {resolvedCancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 disabled:opacity-50 ${variantStyles[variant]}`}
                  >
                    {loading ? t('common.processing') || 'Processing...' : resolvedConfirmLabel}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmDialog;
