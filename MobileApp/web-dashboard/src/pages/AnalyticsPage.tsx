import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getDashboardAnalytics } = useApi();
  const { t } = useLanguage();

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardAnalytics();
      setAnalytics(data.analytics || data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics. Please try again.');
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
        <button onClick={() => { setError(null); loadAnalytics(); }} className="mt-2 text-sm text-red-600 underline">
          Try Again
        </button>
      </div>
    );
  }

  const orders = analytics?.orders || analytics?.orderStats || {};
  const revenue = analytics?.revenue || analytics?.revenueStats || {};
  const customers = analytics?.customers || analytics?.customerStats || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-600">Detailed business insights and reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{orders.total || orders.totalOrders || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(revenue.total || revenue.totalRevenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-600">Total Customers</p>
          <p className="text-2xl font-bold text-blue-600">{customers.total || customers.totalCustomers || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
          <p className="text-2xl font-bold text-accent-600">{formatCurrency(revenue.average || revenue.avgOrderValue || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
          <div className="space-y-3">
            {[
              { label: 'Pending', key: 'pending', color: 'bg-yellow-500' },
              { label: 'In Production', key: 'in_production', color: 'bg-blue-500' },
              { label: 'Completed', key: 'completed', color: 'bg-green-500' },
              { label: 'Cancelled', key: 'cancelled', color: 'bg-red-500' },
            ].map(status => {
              const count = orders[status.key] || 0;
              const total = orders.total || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{status.label}</span>
                    <span className="font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${status.color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h2>
          <div className="space-y-3">
            {[
              { label: 'Corporate', key: 'corporate', color: 'bg-accent-500' },
              { label: 'Individual', key: 'individual', color: 'bg-blue-500' },
              { label: 'Wedding', key: 'wedding', color: 'bg-pink-500' },
              { label: 'Event', key: 'event', color: 'bg-green-500' },
            ].map(segment => {
              const count = customers[segment.key] || 0;
              const total = customers.total || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={segment.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{segment.label}</span>
                    <span className="font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${segment.color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!analytics && (
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <p className="text-yellow-800">No analytics data available. Make sure the backend analytics endpoint is running.</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
