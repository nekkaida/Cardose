import React, { useState, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getApiErrorMessage } from '../utils/apiError';
import type {
  CreateTransactionPayload,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
} from '@shared/types/financial';

const TX_TYPES: TransactionType[] = ['income', 'expense'];
const TX_CATEGORIES: TransactionCategory[] = ['sales', 'materials', 'labor', 'overhead', 'other'];
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'credit_card', 'mobile_payment'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  credit_card: 'Credit Card',
  mobile_payment: 'Mobile Payment',
};

interface CreateTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { createTransaction } = useApi();
  const { t } = useLanguage();

  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<TransactionCategory>('sales');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setType('income');
    setCategory('sales');
    setAmount('');
    setDescription('');
    setPaymentMethod('');
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const payload: CreateTransactionPayload = {
        type,
        category,
        amount: numAmount,
        description: description || undefined,
        payment_method: paymentMethod || undefined,
      };

      await createTransaction(payload);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create transaction'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {t('financial.newTransaction') || 'New Transaction'}
                </DialogTitle>

                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="tx-type"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.type') || 'Type'} *
                    </label>
                    <select
                      id="tx-type"
                      value={type}
                      onChange={(e) => setType(e.target.value as TransactionType)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {TX_TYPES.map((tt) => (
                        <option key={tt} value={tt}>
                          {tt.charAt(0).toUpperCase() + tt.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="tx-category"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.category') || 'Category'} *
                    </label>
                    <select
                      id="tx-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {TX_CATEGORIES.map((tc) => (
                        <option key={tc} value={tc}>
                          {tc.charAt(0).toUpperCase() + tc.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="tx-amount"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.amount') || 'Amount'} (Rp) *
                    </label>
                    <input
                      id="tx-amount"
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tx-description"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.description') || 'Description'}
                    </label>
                    <input
                      id="tx-description"
                      type="text"
                      maxLength={500}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('financial.descriptionPlaceholder') || 'Brief description...'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tx-payment"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.paymentMethod') || 'Payment Method'}
                    </label>
                    <select
                      id="tx-payment"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | '')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">{t('common.select') || 'Select...'}</option>
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {PAYMENT_METHOD_LABELS[pm] || pm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !amount}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading ? t('common.saving') || 'Saving...' : t('common.create') || 'Create'}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CreateTransactionModal;
