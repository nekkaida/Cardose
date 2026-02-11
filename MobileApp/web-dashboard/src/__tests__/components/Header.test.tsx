/**
 * Header Component Unit Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../../components/Header';

// Mock AuthContext
const mockLogout = jest.fn();
const mockUser = { id: '1', username: 'testadmin', email: 'admin@test.com', role: 'admin' };

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    loading: false,
    login: jest.fn(),
    logout: mockLogout,
    token: 'mock-token',
  }),
}));

// Mock LanguageContext
const mockSetLanguage = jest.fn();
let mockLanguage = 'en';

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: mockSetLanguage,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dashboard.title': 'Premium Gift Box Dashboard',
        'dashboard.welcome': 'Welcome to your business management system',
        'nav.logout': 'Logout',
      };
      return translations[key] || key;
    },
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = 'en';
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Header />);
      expect(screen.getByText('Premium Gift Box Dashboard')).toBeInTheDocument();
    });

    it('should display the dashboard title', () => {
      render(<Header />);
      expect(screen.getByText('Premium Gift Box Dashboard')).toBeInTheDocument();
    });

    it('should display the welcome message', () => {
      render(<Header />);
      expect(screen.getByText('Welcome to your business management system')).toBeInTheDocument();
    });

    it('should display the username', () => {
      render(<Header />);
      expect(screen.getByText('testadmin')).toBeInTheDocument();
    });

    it('should display the user role', () => {
      render(<Header />);
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('should display the user avatar with first letter', () => {
      render(<Header />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should display language toggle buttons', () => {
      render(<Header />);
      expect(screen.getByText('EN')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('should call logout when logout button is clicked', async () => {
      render(<Header />);

      const logoutButton = screen.getByTitle('Logout');
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should call setLanguage with "en" when EN button is clicked', async () => {
      render(<Header />);

      await userEvent.click(screen.getByText('EN'));
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });

    it('should call setLanguage with "id" when ID button is clicked', async () => {
      render(<Header />);

      await userEvent.click(screen.getByText('ID'));
      expect(mockSetLanguage).toHaveBeenCalledWith('id');
    });
  });
});
