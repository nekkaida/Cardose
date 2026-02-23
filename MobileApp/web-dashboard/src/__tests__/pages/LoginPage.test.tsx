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
        'login.networkError': 'Could not reach the server. Please check your internet connection.',
        'login.tooManyAttempts': 'Too many failed attempts. Please wait before trying again.',
        'login.cooldown': 'Try again in {seconds}s',
        'login.usernamePlaceholder': 'Enter your username',
        'login.passwordPlaceholder': 'Enter your password',
        'login.showPassword': 'Show password',
        'login.hidePassword': 'Hide password',
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

    it('should show generic network error when login throws an error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        // catch block now shows a safe, generic message instead of raw server errors
        expect(
          screen.getByText('Could not reach the server. Please check your internet connection.')
        ).toBeInTheDocument();
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

  describe('Rate limiting / cooldown', () => {
    // Helper: submit a failed login attempt and wait for loading to finish
    async function failOneAttempt() {
      // Wait for form to be interactable
      await waitFor(() => {
        expect(screen.getByLabelText('Username')).toBeEnabled();
      });
      await userEvent.clear(screen.getByLabelText('Username'));
      await userEvent.clear(screen.getByLabelText('Password'));
      await userEvent.type(screen.getByLabelText('Username'), 'wrong');
      await userEvent.type(screen.getByLabelText('Password'), 'wrong');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      // Wait for loading to complete (error message appears)
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    }

    it('should trigger cooldown after 5 failed attempts', async () => {
      mockLogin.mockResolvedValue(false);
      render(<LoginPage />);

      // First 4 attempts show normal error
      for (let i = 0; i < 4; i++) {
        await failOneAttempt();
      }
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();

      // 5th attempt triggers cooldown
      await failOneAttempt();

      await waitFor(() => {
        expect(
          screen.getByText('Too many failed attempts. Please wait before trying again.')
        ).toBeInTheDocument();
      });
    });

    it('should disable form inputs during cooldown', async () => {
      mockLogin.mockResolvedValue(false);
      render(<LoginPage />);

      for (let i = 0; i < 5; i++) {
        await failOneAttempt();
      }

      // After cooldown triggers, inputs should be disabled
      expect(screen.getByLabelText('Username')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
    });

    it('should show countdown in button during cooldown', async () => {
      mockLogin.mockResolvedValue(false);
      render(<LoginPage />);

      for (let i = 0; i < 5; i++) {
        await failOneAttempt();
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again in/i })).toBeInTheDocument();
      });
    });
  });

  describe('Password visibility toggle', () => {
    it('should toggle password field to text type when show button clicked', async () => {
      render(<LoginPage />);
      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByLabelText('Show password');
      await userEvent.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('should toggle back to password type on second click', async () => {
      render(<LoginPage />);
      const passwordInput = screen.getByLabelText('Password');

      const toggleButton = screen.getByLabelText('Show password');
      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideButton = screen.getByLabelText('Hide password');
      await userEvent.click(hideButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should be keyboard accessible', () => {
      render(<LoginPage />);
      const toggleButton = screen.getByLabelText('Show password');
      // tabIndex should NOT be -1 (keyboard accessible)
      expect(toggleButton).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Error clearing', () => {
    it('should clear error message when submitting again', async () => {
      mockLogin.mockResolvedValueOnce(false);
      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), 'wrong');
      await userEvent.type(screen.getByLabelText('Password'), 'wrong');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
      });

      // Submit again — error should clear
      mockLogin.mockImplementation(() => new Promise(() => {}));
      await userEvent.clear(screen.getByLabelText('Username'));
      await userEvent.clear(screen.getByLabelText('Password'));
      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'pass');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.queryByText('Invalid username or password')).not.toBeInTheDocument();
      });
    });
  });

  describe('Input handling', () => {
    it('should trim username before submitting', async () => {
      mockLogin.mockResolvedValueOnce(true);
      render(<LoginPage />);

      await userEvent.type(screen.getByLabelText('Username'), '  admin  ');
      await userEvent.type(screen.getByLabelText('Password'), 'password123');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-pressed on language toggle buttons', () => {
      render(<LoginPage />);
      const englishButton = screen.getByText('English');
      const indonesiaButton = screen.getByText('Indonesia');
      expect(englishButton).toHaveAttribute('aria-pressed', 'true');
      expect(indonesiaButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have aria-live region for error messages', () => {
      render(<LoginPage />);
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should have aria-busy on form during loading', async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}));
      render(<LoginPage />);

      const form = document.querySelector('form');
      expect(form).toHaveAttribute('aria-busy', 'false');

      await userEvent.type(screen.getByLabelText('Username'), 'admin');
      await userEvent.type(screen.getByLabelText('Password'), 'password');
      await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(form).toHaveAttribute('aria-busy', 'true');
      });
    });
  });
});
