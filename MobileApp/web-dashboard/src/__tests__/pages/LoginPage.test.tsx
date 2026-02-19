/**
 * LoginPage Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/LoginPage';

// Mock AuthContext
const mockLogin = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    login: mockLogin,
    logout: vi.fn(),
    token: null,
  }),
}));

// Mock LanguageContext
const mockSetLanguage = vi.fn();

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: mockSetLanguage,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'login.title': 'Welcome Back',
        'login.subtitle': 'Sign in to your Premium Gift Box account',
        'login.username': 'Username',
        'login.password': 'Password',
        'login.signin': 'Sign In',
        'login.error': 'Invalid username or password',
        'common.loading': 'Loading...',
      };
      return translations[key] || key;
    },
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<LoginPage />);
      expect(screen.getByText('Premium Gift Box')).toBeInTheDocument();
    });

    it('should display the login title', () => {
      render(<LoginPage />);
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('should display the subtitle', () => {
      render(<LoginPage />);
      expect(screen.getByText('Sign in to your Premium Gift Box account')).toBeInTheDocument();
    });

    it('should display username input', () => {
      render(<LoginPage />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should display password input', () => {
      render(<LoginPage />);
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should display the Sign In button', () => {
      render(<LoginPage />);
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should display language toggle buttons', () => {
      render(<LoginPage />);
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Indonesia')).toBeInTheDocument();
    });

    it('should not display error message initially', () => {
      render(<LoginPage />);
      expect(screen.queryByText('Invalid username or password')).not.toBeInTheDocument();
    });
  });

  describe('Form interactions', () => {
    it('should allow typing in username field', async () => {
      render(<LoginPage />);

      const usernameInput = screen.getByLabelText('Username');
      await userEvent.type(usernameInput, 'admin');

      expect(usernameInput).toHaveValue('admin');
    });

    it('should allow typing in password field', async () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      await userEvent.type(passwordInput, 'secret123');

      expect(passwordInput).toHaveValue('secret123');
    });

    it('should have password field of type password', () => {
      render(<LoginPage />);
      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form submission', () => {
    it('should call login with credentials on submit', async () => {
      mockLogin.mockResolvedValueOnce(true);

      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
      });
    });

    it('should show error message when login fails', async () => {
      mockLogin.mockResolvedValueOnce(false);

      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'wrong');
      await userEvent.type(screen.getByLabelText('Password'), 'wrong');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
      });
    });

    it('should show error when login throws an error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        // catch block uses err.message, so "Network error" is displayed (not t('login.error'))
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      // Make login hang so we can see the loading state
      mockLogin.mockImplementation(() => new Promise(() => {}));

      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should disable submit button during loading', async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}));

      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /loading/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Language toggle', () => {
    it('should call setLanguage with "en" when English is clicked', async () => {
      render(<LoginPage />);

      await userEvent.click(screen.getByText('English'));
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });

    it('should call setLanguage with "id" when Indonesia is clicked', async () => {
      render(<LoginPage />);

      await userEvent.click(screen.getByText('Indonesia'));
      expect(mockSetLanguage).toHaveBeenCalledWith('id');
    });
  });
});
