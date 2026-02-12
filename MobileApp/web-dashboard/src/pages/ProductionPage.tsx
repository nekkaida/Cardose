import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductionOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  priority: string;
  due_date: string;
  total_amount: number;
}

const ProductionPage: React.FC = () => {
  const [board, setBoard] = useState<ProductionOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const { getProductionBoard, getProductionStats } = useApi();
  const { t } = useLanguage();

  useEffect(() => {
    loadProduction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProduction = async () => {
    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      const [boardData, statsData] = await Promise.allSettled([
        getProductionBoard(),
        getProductionStats(),
      ]);

      if (boardData.status === 'fulfilled') {
        setBoard(boardData.value.board || boardData.value.orders || []);
      }
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value.stats || statsData.value);
      }
      if (boardData.status === 'rejected' && statsData.status === 'rejected') {
        setError('Failed to load production data. Please try again.');
      } else if (boardData.status === 'rejected' || statsData.status === 'rejected') {
        setWarning('Some production data could not be loaded.');
      }
    } catch (err) {
      console.error('Error loading production:', err);
      setError('Failed to load production data. Please try again.');
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stages = [
    { key: 'designing', label: 'Designing', color: 'border-blue-400' },
    { key: 'production', label: 'In Production', color: 'border-yellow-400' },
    { key: 'quality_control', label: 'Quality Control', color: 'border-accent-400' },
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
        <button onClick={() => { setError(null); loadProduction(); }} className="mt-2 text-sm text-red-600 underline">
          Try Again
        </button>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('production.title')}</h1>
          <p className="text-gray-600">Track production stages and manage workflows</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm font-medium text-gray-600">Designing</p>
            <p className="text-2xl font-bold text-blue-600">{stats.designing || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm font-medium text-gray-600">In Production</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.in_production || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm font-medium text-gray-600">Quality Control</p>
            <p className="text-2xl font-bold text-accent-600">{stats.quality_control || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <p className="text-sm font-medium text-gray-600">Urgent Orders</p>
            <p className={`text-2xl font-bold ${(stats.urgent_orders || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.urgent_orders || 0}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stages.map(stage => {
          const stageOrders = board.filter(o => o.status === stage.key);
          return (
            <div key={stage.key} className={`bg-white rounded-xl shadow-sm border-t-4 ${stage.color} border border-gray-100`}>
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                <span className="text-sm text-gray-500">{stageOrders.length} orders</span>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {stageOrders.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No orders in this stage</p>
                ) : stageOrders.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{order.customer_name}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{order.due_date ? new Date(order.due_date).toLocaleDateString('id-ID') : '-'}</span>
                      <span className="text-xs font-medium text-gray-700">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductionPage;
