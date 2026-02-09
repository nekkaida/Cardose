import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { getDashboardAnalytics } = useApi();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getDashboardAnalytics();
      setData(result);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error || 'Failed to load dashboard data'}</p>
        <button onClick={() => { setError(''); loadDashboardData(); }} className="mt-2 text-sm text-red-600 underline">
          Try Again
        </button>
      </div>
    );
  }

  const revenue = data.revenue || {};
  const orders = data.orders || {};
  const customers = data.customers || {};
  const inventory = data.inventory || {};
  const production = data.production || {};

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(revenue.total_revenue)}</p>
              <p className="text-sm text-green-600 mt-1">Paid: {formatCurrency(revenue.paid_revenue)}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(orders.total_orders)}</p>
              <p className="text-sm text-blue-600 mt-1">Active: {formatNumber(orders.active_orders)}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatNumber(customers.total_customers)}</p>
              <p className="text-sm text-purple-600 mt-1">VIP: {formatNumber(customers.vip_customers)}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{orders.completion_rate || 0}%</p>
              <p className="text-sm text-green-600 mt-1">Completed: {formatNumber(orders.completed_orders)}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Materials</span>
              <span className="text-lg font-bold text-gray-900">{formatNumber(inventory.total_materials)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Low Stock</span>
              <span className={`text-lg font-bold ${inventory.low_stock > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatNumber(inventory.low_stock)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Out of Stock</span>
              <span className={`text-lg font-bold ${inventory.out_of_stock > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNumber(inventory.out_of_stock)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Value</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(inventory.total_value)}</span>
            </div>
          </div>
        </div>

        {/* Production */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Production</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Designing</span>
              <span className="text-lg font-bold text-blue-600">{formatNumber(production.designing)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">In Production</span>
              <span className="text-lg font-bold text-yellow-600">{formatNumber(production.in_production)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Quality Control</span>
              <span className="text-lg font-bold text-purple-600">{formatNumber(production.quality_control)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Urgent Orders</span>
              <span className={`text-lg font-bold ${production.urgent_orders > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatNumber(production.urgent_orders)}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/orders')} className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
              📦 View Orders
            </button>
            <button onClick={() => navigate('/customers')} className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              👥 View Customers
            </button>
            <button onClick={() => navigate('/inventory')} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              📋 View Inventory
            </button>
            <button onClick={() => navigate('/analytics')} className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              📊 View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-700">Paid Revenue</p>
            <p className="text-xl font-bold text-green-800">{formatCurrency(revenue.paid_revenue)}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-700">Pending Revenue</p>
            <p className="text-xl font-bold text-yellow-800">{formatCurrency(revenue.pending_revenue)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700">Avg Order Value</p>
            <p className="text-xl font-bold text-blue-800">{formatCurrency(revenue.average_order_value)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-700">Invoice Count</p>
            <p className="text-xl font-bold text-purple-800">{formatNumber(revenue.invoice_count)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
