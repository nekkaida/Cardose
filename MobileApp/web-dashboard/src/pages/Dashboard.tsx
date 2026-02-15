import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4e3a21', '#a67c36', '#2563eb', '#10b981', '#ef4444', '#f59e0b'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { getDashboardAnalytics, getRevenueAnalytics } = useApi();
  useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashResult, revResult] = await Promise.allSettled([
        getDashboardAnalytics(),
        getRevenueAnalytics(),
      ]);
      if (dashResult.status === 'fulfilled') setData(dashResult.value);
      if (revResult.status === 'fulfilled') setRevenueData(revResult.value);
      if (dashResult.status === 'rejected' && revResult.status === 'rejected') {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error || 'Failed to load dashboard data'}</p>
        <button onClick={() => { setError(''); loadDashboardData(); }} className="mt-2 text-sm text-red-600 underline">Try Again</button>
      </div>
    );
  }

  const revenue = data.revenue || {};
  const orders = data.orders || {};
  const customers = data.customers || {};
  const inventory = data.inventory || {};
  const production = data.production || {};

  const orderStatusData = [
    { name: 'Pending', value: orders.pending_orders || 0 },
    { name: 'Active', value: orders.active_orders || 0 },
    { name: 'Completed', value: orders.completed_orders || 0 },
  ].filter(d => d.value > 0);

  const revenueTrend = (revenueData?.trend || revenueData?.analytics?.revenue?.monthlyRevenue || []).map((m: any) => ({
    month: m.month || m.period || '',
    revenue: m.revenue || m.total || m.amount || 0,
  }));

  const productionData = [
    { stage: 'Designing', count: production.designing || 0 },
    { stage: 'Production', count: production.in_production || 0 },
    { stage: 'QC', count: production.quality_control || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatShortCurrency(revenue.total_revenue || 0)}</p>
              <p className="text-xs text-accent-600 mt-1">{formatShortCurrency(revenue.paid_revenue || 0)} paid</p>
            </div>
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(orders.total_orders)}</p>
              <p className="text-xs text-primary-500 mt-1">{formatNumber(orders.active_orders)} active</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(customers.total_customers)}</p>
              <p className="text-xs text-accent-600 mt-1">{formatNumber(customers.vip_customers)} VIP</p>
            </div>
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{orders.completion_rate || 0}%</p>
              <p className="text-xs text-green-600 mt-1">{formatNumber(orders.completed_orders)} done</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#4e3a21" fill="#4e3a21" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16 text-sm">No revenue data yet</p>}
        </div>

        {/* Order Status Pie */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Order Status</h3>
          {orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {orderStatusData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-16 text-sm">No order data</p>}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Pipeline */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Production Pipeline</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4e3a21" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Inventory</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Materials</span>
              <span className="text-lg font-bold text-gray-900">{formatNumber(inventory.total_materials)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Low Stock</span>
              <span className={`text-lg font-bold ${inventory.low_stock > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatNumber(inventory.low_stock)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Out of Stock</span>
              <span className={`text-lg font-bold ${inventory.out_of_stock > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNumber(inventory.out_of_stock)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="text-lg font-bold text-gray-900">{formatShortCurrency(inventory.total_value || 0)}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2.5">
            {[
              { label: 'View Orders', path: '/orders' },
              { label: 'View Customers', path: '/customers' },
              { label: 'View Inventory', path: '/inventory' },
              { label: 'View Reports', path: '/analytics' },
            ].map(action => (
              <button key={action.path} onClick={() => navigate(action.path)}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-gray-100">
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium">Paid</p>
            <p className="text-lg font-bold text-gray-900">{formatShortCurrency(revenue.paid_revenue || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium">Pending</p>
            <p className="text-lg font-bold text-gray-900">{formatShortCurrency(revenue.pending_revenue || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium">Avg Order</p>
            <p className="text-lg font-bold text-gray-900">{formatShortCurrency(revenue.average_order_value || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium">Invoices</p>
            <p className="text-lg font-bold text-gray-900">{formatNumber(revenue.invoice_count)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
