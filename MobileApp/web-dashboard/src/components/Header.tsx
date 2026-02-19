import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="mt-1 text-gray-600">{t('dashboard.welcome')}</p>
          </div>

          {/* Right Side - User Info & Controls */}
          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('id')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  language === 'id'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ID
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="flex flex-col text-right">
                <span className="text-sm font-medium text-gray-900">{user?.username}</span>
                <span className="text-xs capitalize text-gray-500">{user?.role}</span>
              </div>

              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-primary-700">
                <span className="text-lg font-medium text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="text-gray-400 transition-colors hover:text-gray-600"
                title={t('nav.logout')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
