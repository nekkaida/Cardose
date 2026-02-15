import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#4e3a21', '#a67c36', '#2563eb', '#10b981', '#ef4444', '#f59e0b', '#ec4899'];

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getDashboardAnalytics, getRevenueAnalytics, getCustomerAnalytics } = useApi();
  const { t } = useLanguage();

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, revData, custData] = await Promise.allSettled([
        getDashboardAnalytics(),
        getRevenueAnalytics(),
        getCustomerAnalytics(),
      ]);
      if (dashData.status === 'fulfilled') setAnalytics(dashData.value.analytics || dashData.value);
      if (revData.status === 'fulfilled') setRevenueData(revData.value);
      if (custData.status === 'fulfilled') setCustomerData(custData.value);
      if (dashData.status === 'rejected' && revData.status === 'rejected' && custData.status === 'rejected') {
        setError('Failed to load analytics. Please try again.');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics. Please try again.');
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
        <button onClick={() => { setError(null); loadAnalytics(); }} className="mt-2 text-sm text-red-600 underline">Try Again</button>
      </div>
    );
  }

  const orders = analytics?.orders || analytics?.orderStats || {};
  const revenue = analytics?.revenue || analytics?.revenueStats || {};
  const customers = analytics?.customers || analytics?.customerStats || {};
  const production = analytics?.production || {};
  const inventory = analytics?.inventory || {};

  // Prepare chart data
  const orderStatusData = [
    { name: 'Pending', value: orders.pending || orders.pending_orders || 0 },
    { name: 'Designing', value: orders.designing || production.designing || 0 },
    { name: 'Production', value: orders.production || production.in_production || 0 },
    { name: 'QC', value: orders.quality_control || production.quality_control || 0 },
    { name: 'Completed', value: orders.completed || orders.completed_orders || 0 },
    { name: 'Cancelled', value: orders.cancelled || orders.cancelled_orders || 0 },
  ].filter(d => d.value > 0);

  const customerSegmentData = (customerData?.by_business_type || [
    { business_type: 'corporate', count: customers.corporate || 0 },
    { business_type: 'wedding', count: customers.wedding || 0 },
    { business_type: 'individual', count: customers.individual || 0 },
    { business_type: 'event', count: customers.event || 0 },
  ]).map((s: any) => ({ name: s.business_type, value: s.count })).filter((d: any) => d.value > 0);

  const revenueTrend = (revenueData?.trend || revenueData?.analytics?.revenue?.monthlyRevenue || []).map((m: any) => ({
    month: m.month || m.period || '',
    revenue: m.revenue || m.total || m.amount || 0,
  }));

  const topCustomers = (customerData?.top_customers || []).slice(0, 5).map((c: any) => ({
    name: (c.name || '').length > 18 ? (c.name || '').substring(0, 18) + '...' : c.name,
    revenue: c.total_revenue || c.total_spent || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
        <p className="text-gray-500 text-sm">Detailed business insights and reports</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.total_orders || orders.total || 0}</p>
          <p className="text-xs text-green-600 mt-1">{orders.completed_orders || orders.completed || 0} completed</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatShortCurrency(revenue.total_revenue || revenue.total || 0)}</p>
          <p className="text-xs text-green-600 mt-1">{formatShortCurrency(revenue.paid_revenue || 0)} paid</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{customers.total_customers || customers.total || 0}</p>
          <p className="text-xs text-accent-600 mt-1">{customers.vip_customers || customers.vip || 0} VIP</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Order</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatShortCurrency(revenue.average_order_value || revenue.average || 0)}</p>
          <p className="text-xs text-blue-600 mt-1">{revenue.invoice_count || 0} invoices</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Pie */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
          {orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {orderStatusData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Orders']} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16">No order data</p>}
        </div>

        {/* Customer Segments Pie */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Customer Segments</h2>
          {customerSegmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={customerSegmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {customerSegmentData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Customers']} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16">No customer data</p>}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#4e3a21" fill="#4e3a21" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16">No revenue trend data</p>}
        </div>

        {/* Top Customers Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Customers by Revenue</h2>
          {topCustomers.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCustomers} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                <Bar dataKey="revenue" fill="#a67c36" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16">No customer data</p>}
        </div>
      </div>

      {/* Production & Inventory Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Production Pipeline</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { stage: 'Designing', count: production.designing || 0 },
              { stage: 'Production', count: production.in_production || 0 },
              { stage: 'QC', count: production.quality_control || 0 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4e3a21" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Inventory Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 uppercase">Total Materials</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.total_materials || 0}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-xs text-red-500 uppercase">Out of Stock</p>
              <p className="text-2xl font-bold text-red-700">{inventory.out_of_stock || 0}</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-xs text-yellow-600 uppercase">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-700">{inventory.low_stock || 0}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-xs text-green-600 uppercase">Total Value</p>
              <p className="text-2xl font-bold text-green-700">{formatShortCurrency(inventory.total_value || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
