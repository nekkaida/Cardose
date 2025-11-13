import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import { useLanguage } from '../contexts/LanguageContext';

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getInventory } = useApi();
  const { t } = useLanguage();

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await getInventory();
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-gray-600">Track stock levels and manage materials</p>
        </div>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
          📋 Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Inventory Management</h2>
        <p className="text-gray-600">Inventory tracking interface will be displayed here.</p>
      </div>
    </div>
  );
};

export default InventoryPage;