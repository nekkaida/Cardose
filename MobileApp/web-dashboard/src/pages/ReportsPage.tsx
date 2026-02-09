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
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const reportTypes = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'inventory', label: 'Inventory Report' },
    { key: 'production', label: 'Production Report' },
    { key: 'customers', label: 'Customer Report' },
    { key: 'financial', label: 'Financial Report' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
        <button onClick={() => { setError(null); loadReport(); }} className="mt-2 text-sm text-red-600 underline">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
          <p className="text-gray-600">Generate and view business reports</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {reportTypes.map(rt => (
                <option key={rt.key} value={rt.key}>{rt.label}</option>
              ))}
            </select>
          </div>
          {reportType === 'sales' && (
            <>
              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="Start date"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                  placeholder="End date"
                />
              </div>
              <button
                onClick={loadReport}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Generate
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {reportTypes.find(rt => rt.key === reportType)?.label}
        </h2>
        {reportData ? (
          <div className="space-y-4">
            {typeof reportData === 'object' && !Array.isArray(reportData) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(reportData).filter(([key]) => typeof reportData[key] !== 'object').map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-bold text-gray-900">
                      {typeof value === 'number' && key.includes('amount') || key.includes('revenue') || key.includes('value') || key.includes('cost')
                        ? formatCurrency(value as number)
                        : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(reportData) && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {reportData.length > 0 && Object.keys(reportData[0]).map(key => (
                        <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((val: any, j: number) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof val === 'number' ? val.toLocaleString('id-ID') : String(val || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No report data available.</p>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
