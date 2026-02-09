import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navigation = [
    {
      name: t('nav.dashboard'),
      href: '/dashboard',
      icon: '📊',
      current: location.pathname === '/dashboard' || location.pathname === '/',
    },
    {
      name: t('nav.orders'),
      href: '/orders',
      icon: '📦',
      current: location.pathname === '/orders',
    },
    {
      name: t('nav.customers'),
      href: '/customers',
      icon: '👥',
      current: location.pathname === '/customers',
    },
    {
      name: t('nav.inventory'),
      href: '/inventory',
      icon: '📋',
      current: location.pathname === '/inventory',
    },
    {
      name: t('nav.financial'),
      href: '/financial',
      icon: '💰',
      current: location.pathname === '/financial',
    },
    {
      name: t('nav.analytics'),
      href: '/analytics',
      icon: '📈',
      current: location.pathname === '/analytics',
    },
    {
      name: t('nav.production'),
      href: '/production',
      icon: '🏭',
      current: location.pathname === '/production',
    },
    {
      name: t('nav.reports'),
      href: '/reports',
      icon: '📄',
      current: location.pathname === '/reports',
    },
    {
      name: t('nav.users'),
      href: '/users',
      icon: '🔑',
      current: location.pathname === '/users',
    },
    {
      name: t('nav.settings'),
      href: '/settings',
      icon: '⚙️',
      current: location.pathname === '/settings',
    },
  ];

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="flex items-center">
          <span className="text-2xl">🎁</span>
          <span className="ml-2 text-white font-bold text-lg">Premium Gift Box</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
              item.current
                ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          v1.0.0 - Indonesian Business Management
        </div>
      </div>
    </div>
  );
};

export default Sidebar;