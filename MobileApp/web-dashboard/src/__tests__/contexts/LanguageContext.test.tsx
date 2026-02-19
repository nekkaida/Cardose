/**
 * LanguageContext Unit Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';

// Test component that uses the language context
const TestComponent: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <div data-testid="language">{language}</div>
      <div data-testid="dashboard-title">{t('dashboard.title')}</div>
      <div data-testid="login-title">{t('login.title')}</div>
      <div data-testid="nav-orders">{t('nav.orders')}</div>
      <div data-testid="nav-logout">{t('nav.logout')}</div>
      <div data-testid="missing-key">{t('nonexistent.key')}</div>
      <button onClick={() => setLanguage('en')}>Set English</button>
      <button onClick={() => setLanguage('id')}>Set Indonesian</button>
    </div>
  );
};

describe('LanguageContext', () => {
  describe('useLanguage hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useLanguage must be used within a LanguageProvider');

      consoleError.mockRestore();
    });
  });

  describe('Initial state', () => {
    it('should default to English', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('language').textContent).toBe('en');
    });

    it('should translate keys to English by default', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('dashboard-title').textContent).toBe('Premium Gift Box Dashboard');
      expect(screen.getByTestId('login-title').textContent).toBe('Welcome Back');
      expect(screen.getByTestId('nav-orders').textContent).toBe('Orders');
      expect(screen.getByTestId('nav-logout').textContent).toBe('Logout');
    });
  });

  describe('Language switching', () => {
    it('should switch to Indonesian', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      await userEvent.click(screen.getByText('Set Indonesian'));

      expect(screen.getByTestId('language').textContent).toBe('id');
      expect(screen.getByTestId('dashboard-title').textContent).toBe('Dasbor Premium Gift Box');
      expect(screen.getByTestId('login-title').textContent).toBe('Selamat Datang Kembali');
      expect(screen.getByTestId('nav-orders').textContent).toBe('Pesanan');
      expect(screen.getByTestId('nav-logout').textContent).toBe('Keluar');
    });

    it('should switch back to English from Indonesian', async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Switch to Indonesian first
      await userEvent.click(screen.getByText('Set Indonesian'));
      expect(screen.getByTestId('language').textContent).toBe('id');

      // Switch back to English
      await userEvent.click(screen.getByText('Set English'));
      expect(screen.getByTestId('language').textContent).toBe('en');
      expect(screen.getByTestId('dashboard-title').textContent).toBe('Premium Gift Box Dashboard');
    });
  });

  describe('Translation fallback', () => {
    it('should return the key itself when translation is missing', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('missing-key').textContent).toBe('nonexistent.key');
    });
  });
});
