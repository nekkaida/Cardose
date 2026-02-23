import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency } from '../utils/formatters';
import { getApiErrorMessage } from '../utils/apiError';
import type { CreateInvoicePayload } from '@shared/types/financial';

const PPN_RATE = 0.11; // 11% Indonesian VAT

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  business_type: string;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ open, onClose, onSuccess }) => {
  const { createInvoice, getCustomers } = useApi();
  const { t } = useLanguage();

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown on click outside
  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomerDropdown]);

  // Form state
  const [subtotal, setSubtotal] = useState('');
  const [discount, setDiscount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate PPN and total from subtotal/discount
  const computed = useMemo(() => {
    const sub = Number(subtotal) || 0;
    const disc = Number(discount) || 0;
    const afterDiscount = Math.max(sub - disc, 0);
    const ppn = afterDiscount * PPN_RATE;
    const total = afterDiscount + ppn;
    return { afterDiscount, ppn, total };
  }, [subtotal, discount]);

  // Load customers when search changes
  useEffect(() => {
    if (!open) return;
    const loadCustomers = async () => {
      setCustomersLoading(true);
      try {
        const params: Record<string, string | number> = { limit: 20, page: 1 };
        if (debouncedCustomerSearch) params.search = debouncedCustomerSearch;
        const data = await getCustomers(params);
        setCustomers(data.customers || []);
        setHighlightedIndex(-1);
      } catch {
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    };
    loadCustomers();
  }, [open, debouncedCustomerSearch, getCustomers]);

  const resetForm = () => {
    setCustomerSearch('');
    setSelectedCustomer(null);
    setSubtotal('');
    setDiscount('0');
    setDueDate('');
    setNotes('');
    setError(null);
    setShowCustomerDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (!showCustomerDropdown || customers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < customers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : customers.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectCustomer(customers[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedCustomer) {
      setError('Please select a customer from the list');
      setLoading(false);
      return;
    }

    const sub = Number(subtotal);
    if (!sub || sub <= 0) {
      setError('Subtotal must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const payload: CreateInvoicePayload = {
        customer_id: selectedCustomer.id,
        subtotal: sub,
        discount: Number(discount) || 0,
        ppn_amount: computed.ppn,
        total_amount: computed.total,
        due_date: dueDate || undefined,
        notes: notes || undefined,
      };

      await createInvoice(payload);
      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create invoice'));
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
                  {t('financial.newInvoice') || 'New Invoice'}
                </DialogTitle>

                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  {/* Customer Search */}
                  <div className="relative" ref={customerDropdownRef}>
                    <label
                      htmlFor="inv-customer"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.customer') || 'Customer'} *
                    </label>
                    <input
                      id="inv-customer"
                      type="text"
                      required
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={showCustomerDropdown && !selectedCustomer}
                      aria-autocomplete="list"
                      aria-activedescendant={
                        highlightedIndex >= 0 ? `customer-option-${highlightedIndex}` : undefined
                      }
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomer(null);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onKeyDown={handleCustomerKeyDown}
                      placeholder={t('financial.searchCustomer') || 'Search customer by name...'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {selectedCustomer && (
                      <span className="absolute right-3 top-[34px] text-xs text-green-600">
                        {selectedCustomer.business_type}
                      </span>
                    )}
                    {/* Dropdown */}
                    {showCustomerDropdown && !selectedCustomer && (
                      <div
                        role="listbox"
                        className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                      >
                        {customersLoading ? (
                          <div className="px-4 py-3 text-sm text-gray-400">
                            {t('common.loading') || 'Loading...'}
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400">
                            {customerSearch
                              ? t('financial.noCustomersFound') || 'No customers found'
                              : t('financial.typeToSearch') || 'Type to search customers'}
                          </div>
                        ) : (
                          customers.map((c, idx) => (
                            <button
                              key={c.id}
                              id={`customer-option-${idx}`}
                              role="option"
                              aria-selected={highlightedIndex === idx}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                                highlightedIndex === idx
                                  ? 'bg-primary-50 text-primary-700'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div>
                                <span className="font-medium text-gray-900">{c.name}</span>
                                {c.email && (
                                  <span className="ml-2 text-xs text-gray-400">{c.email}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{c.business_type}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="inv-subtotal"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.subtotal') || 'Subtotal'} (Rp) *
                    </label>
                    <input
                      id="inv-subtotal"
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={subtotal}
                      onChange={(e) => setSubtotal(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="inv-discount"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.discount') || 'Discount'} (Rp)
                    </label>
                    <input
                      id="inv-discount"
                      type="number"
                      min="0"
                      step="1"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Auto-calculated breakdown */}
                  {Number(subtotal) > 0 && (
                    <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>{t('financial.afterDiscount') || 'After Discount'}</span>
                        <span>{formatCurrency(computed.afterDiscount)}</span>
                      </div>
                      <div className="mt-1 flex justify-between text-gray-600">
                        <span>PPN (11%)</span>
                        <span>{formatCurrency(computed.ppn)}</span>
                      </div>
                      <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900">
                        <span>{t('financial.totalAmount') || 'Total'}</span>
                        <span>{formatCurrency(computed.total)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="inv-due-date"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.dueDate') || 'Due Date'}
                    </label>
                    <input
                      id="inv-due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="inv-notes"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('financial.notes') || 'Notes'}
                    </label>
                    <textarea
                      id="inv-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
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
                      disabled={loading || !selectedCustomer || !subtotal}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading
                        ? t('common.saving') || 'Saving...'
                        : t('financial.createInvoice') || 'Create Invoice'}
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

export default CreateInvoiceModal;
