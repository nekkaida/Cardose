/**
 * Sidebar Component Unit Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock react-router-dom to avoid ESM import issues
let mockPathname = '/dashboard';
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ to, children, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import Sidebar from '../../components/Sidebar';

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.dashboard': 'Dashboard',
        'nav.orders': 'Orders',
        'nav.customers': 'Customers',
        'nav.inventory': 'Inventory',
        'nav.financial': 'Financial',
        'nav.analytics': 'Analytics',
        'nav.production': 'Production',
        'nav.reports': 'Reports',
        'nav.users': 'Users',
        'nav.settings': 'Settings',
      };
      return translations[key] || key;
    },
  }),
}));

const renderSidebar = (initialPath: string = '/dashboard') => {
  mockPathname = initialPath;
  return render(<Sidebar />);
};

describe('Sidebar', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderSidebar();
      expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
    });

    it('should display the logo text', () => {
      renderSidebar();
      expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
    });

    it('should display the version footer', () => {
      renderSidebar();
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });
  });

  describe('Navigation items', () => {
    it('should render all navigation links', () => {
      renderSidebar();

      const navItems = [
        'Dashboard',
        'Orders',
        'Customers',
        'Inventory',
        'Financial',
        'Analytics',
        'Production',
        'Reports',
        'Users',
        'Settings',
      ];

      navItems.forEach((name) => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('should link Dashboard to /dashboard', () => {
      renderSidebar();
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should link Orders to /orders', () => {
      renderSidebar();
      const ordersLink = screen.getByText('Orders').closest('a');
      expect(ordersLink).toHaveAttribute('href', '/orders');
    });

    it('should link Customers to /customers', () => {
      renderSidebar();
      const link = screen.getByText('Customers').closest('a');
      expect(link).toHaveAttribute('href', '/customers');
    });

    it('should link Inventory to /inventory', () => {
      renderSidebar();
      const link = screen.getByText('Inventory').closest('a');
      expect(link).toHaveAttribute('href', '/inventory');
    });

    it('should link Financial to /financial', () => {
      renderSidebar();
      const link = screen.getByText('Financial').closest('a');
      expect(link).toHaveAttribute('href', '/financial');
    });

    it('should link Analytics to /analytics', () => {
      renderSidebar();
      const link = screen.getByText('Analytics').closest('a');
      expect(link).toHaveAttribute('href', '/analytics');
    });

    it('should link Production to /production', () => {
      renderSidebar();
      const link = screen.getByText('Production').closest('a');
      expect(link).toHaveAttribute('href', '/production');
    });

    it('should link Settings to /settings', () => {
      renderSidebar();
      const link = screen.getByText('Settings').closest('a');
      expect(link).toHaveAttribute('href', '/settings');
    });
  });

  describe('Active state', () => {
    it('should highlight Dashboard when on /dashboard', () => {
      renderSidebar('/dashboard');
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('bg-primary-50');
    });

    it('should highlight Dashboard when on /', () => {
      renderSidebar('/');
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('bg-primary-50');
    });

    it('should highlight Orders when on /orders', () => {
      renderSidebar('/orders');
      const ordersLink = screen.getByText('Orders').closest('a');
      expect(ordersLink?.className).toContain('bg-primary-50');
    });

    it('should not highlight Dashboard when on /orders', () => {
      renderSidebar('/orders');
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).not.toContain('bg-primary-50');
    });
  });
});
