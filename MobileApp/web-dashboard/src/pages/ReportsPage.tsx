import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('sales');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { getSalesReport, getInventoryReport, getProductionReport, getCustomerReport, getFinancialReport } = useApi();
  const { t } = useLanguage();

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      switch (reportType) {
        case 'sales': data = await getSalesReport(params); break;
        case 'inventory': data = await getInventoryReport(); break;
        case 'production': data = await getProductionReport(); break;
        case 'customers': data = await getCustomerReport(); break;
        case 'financial': data = await getFinancialReport(); break;
        default: data = await getSalesReport(params);
      }
      setReportData(data.report || data);
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const isCurrencyKey = (key: string) =>
    key.includes('amount') || key.includes('revenue') || key.includes('value') ||
    key.includes('cost') || key.includes('profit') || key.includes('spent') ||
    key.includes('expense') || key.includes('total_value') || key.includes('price');

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (isCurrencyKey(key)) return formatCurrency(value);
      if (key.includes('rate') || key.includes('percentage')) return `${value.toFixed(1)}%`;
      return new Intl.NumberFormat('id-ID').format(value);
    }
    return String(value);
  };

  const formatLabel = (key: string): string => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const reportTypes = [
    { key: 'sales', label: 'Sales Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { key: 'inventory', label: 'Inventory Report', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { key: 'production', label: 'Production Report', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { key: 'customers', label: 'Customer Report', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'financial', label: 'Financial Report', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const renderReportSection = (title: string, data: any) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;

    // If data is an array, render as table
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      const keys = Object.keys(data[0]);
      return (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{formatLabel(title)}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {keys.map(key => (
                    <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{formatLabel(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 20).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {keys.map((key, j) => (
                      <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatValue(key, row[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // If data is object with nested sections
    if (typeof data === 'object') {
      const scalarEntries = Object.entries(data).filter(([, v]) => typeof v !== 'object' || v === null);
      const nestedEntries = Object.entries(data).filter(([, v]) => typeof v === 'object' && v !== null);

      return (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{formatLabel(title)}</h3>
          {scalarEntries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {scalarEntries.map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{formatLabel(key)}</p>
                  <p className="text-base font-semibold text-gray-900 mt-0.5">{formatValue(key, value)}</p>
                </div>
              ))}
            </div>
          )}
          {nestedEntries.map(([key, value]) => (
            <div key={key}>{renderReportSection(key, value)}</div>
          ))}
        </div>
      );
    }

    return null;
  };

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
        <button onClick={() => { setError(null); loadReport(); }} className="mt-2 text-sm text-red-600 underline">Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-gray-500 text-sm">Generate and view business reports</p>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map(rt => (
          <button
            key={rt.key}
            onClick={() => setReportType(rt.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === rt.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={rt.icon} /></svg>
            {rt.label}
          </button>
        ))}
      </div>

      {/* Date Filters for Sales */}
      {reportType === 'sales' && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
            <button onClick={loadReport} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {reportTypes.find(rt => rt.key === reportType)?.label}
          </h2>
          <span className="text-xs text-gray-400">Generated at {new Date().toLocaleString('id-ID')}</span>
        </div>
        {reportData ? (
          <div>
            {typeof reportData === 'object' && !Array.isArray(reportData)
              ? Object.entries(reportData).map(([key, value]) => (
                  <div key={key}>
                    {typeof value === 'object' && value !== null
                      ? renderReportSection(key, value)
                      : null}
                  </div>
                ))
              : null
            }
            {/* Render top-level scalars */}
            {typeof reportData === 'object' && !Array.isArray(reportData) && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(reportData)
                  .filter(([, v]) => typeof v !== 'object' || v === null)
                  .map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">{formatLabel(key)}</p>
                      <p className="text-base font-semibold text-gray-900 mt-0.5">{formatValue(key, value)}</p>
                    </div>
                  ))}
              </div>
            )}
            {Array.isArray(reportData) && renderReportSection('results', reportData)}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-12 text-sm">No report data available</p>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
