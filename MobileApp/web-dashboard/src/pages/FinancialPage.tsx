import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const FinancialPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');

  // Transaction modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [txForm, setTxForm] = useState({ type: 'income', category: 'sales', amount: '', description: '' });

  const { getFinancialSummary, getTransactions, getInvoices, createTransaction, updateInvoiceStatus } = useApi();
  const { t } = useLanguage();

  useEffect(() => {
    loadFinancialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      const [summaryData, transData, invData] = await Promise.allSettled([
        getFinancialSummary(),
        getTransactions(),
        getInvoices(),
      ]);

      if (summaryData.status === 'fulfilled') setSummary(summaryData.value.summary || summaryData.value);
      if (transData.status === 'fulfilled') setTransactions(transData.value.transactions || []);
      if (invData.status === 'fulfilled') setInvoices(invData.value.invoices || []);

      if (summaryData.status === 'rejected' && transData.status === 'rejected' && invData.status === 'rejected') {
        setError('Failed to load financial data. Please try again.');
      } else if (summaryData.status === 'rejected' || transData.status === 'rejected') {
        setWarning('Some financial data could not be loaded.');
      }
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError('Failed to load financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(0)}M`;
    if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
    return `Rp ${amount}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleCreateTx = async () => {
    if (!txForm.amount) return;
    try {
      setSavingTx(true);
      await createTransaction({
        type: txForm.type,
        category: txForm.category,
        amount: Number(txForm.amount),
        description: txForm.description,
      });
      setShowTxModal(false);
      setTxForm({ type: 'income', category: 'sales', amount: '', description: '' });
      loadFinancialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create transaction');
    } finally {
      setSavingTx(false);
    }
  };

  const handleInvoiceStatus = async (id: string, status: string) => {
    try {
      await updateInvoiceStatus(id, status);
      loadFinancialData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update invoice');
    }
  };

  const totalRevenue = summary?.total_revenue || summary?.totalRevenue || 0;
  const totalExpenses = summary?.total_expenses || summary?.totalExpenses || 0;
  const netProfit = totalRevenue - totalExpenses;
  const pendingInvoices = summary?.pending_invoices || summary?.pendingInvoices || 0;

  // Category breakdown for chart
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  transactions.forEach((tx: any) => {
    const cat = tx.category || 'other';
    if (tx.type === 'income') incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (tx.amount || 0);
    else expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (tx.amount || 0);
  });

  const categoryChartData = Array.from(new Set([...Object.keys(incomeByCategory), ...Object.keys(expenseByCategory)])).map(cat => ({
    category: cat,
    income: incomeByCategory[cat] || 0,
    expense: expenseByCategory[cat] || 0,
  })).sort((a, b) => (b.income + b.expense) - (a.income + a.expense)).slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => { setError(null); loadFinancialData(); }} className="mt-2 text-sm text-red-600 underline">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{warning}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('financial.title')}</h1>
          <p className="text-gray-500 text-sm">Financial overview and transactions</p>
        </div>
        <button onClick={() => setShowTxModal(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          + Transaction
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatShortCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatShortCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Net Profit</p>
          <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatShortCurrency(netProfit)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Pending Invoices</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingInvoices}</p>
        </div>
      </div>

      {/* Chart */}
      {categoryChartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Income vs Expenses by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6">
          <div className="flex space-x-6">
            <button onClick={() => setActiveTab('transactions')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Transactions ({transactions.length})
            </button>
            <button onClick={() => setActiveTab('invoices')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Invoices ({invoices.length})
            </button>
          </div>
        </div>

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No transactions</td></tr>
                ) : transactions.slice(0, 30).map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(tx.created_at || tx.date)}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{tx.description || '-'}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">{tx.category || '-'}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No invoices</td></tr>
                ) : invoices.slice(0, 30).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{inv.invoice_number || inv.id}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{inv.customer_name || '-'}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(inv.created_at || inv.date)}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inv.status || 'unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">{formatCurrency(inv.total_amount || inv.amount)}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-right space-x-1">
                      {inv.status !== 'paid' && (
                        <button onClick={() => handleInvoiceStatus(inv.id, 'paid')} className="text-green-600 hover:text-green-800 text-xs font-medium">Mark Paid</button>
                      )}
                      {inv.status === 'unpaid' && (
                        <button onClick={() => handleInvoiceStatus(inv.id, 'overdue')} className="text-red-600 hover:text-red-800 text-xs font-medium ml-2">Overdue</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">New Transaction</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                    <option value="sales">Sales</option>
                    <option value="materials">Materials</option>
                    <option value="labor">Labor</option>
                    <option value="overhead">Overhead</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (IDR) *</label>
                <input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Description..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowTxModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateTx} disabled={savingTx || !txForm.amount}
                className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {savingTx ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialPage;
