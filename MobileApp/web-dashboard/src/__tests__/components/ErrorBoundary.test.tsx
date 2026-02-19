/**
 * ErrorBoundary Component Unit Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// A component that throws an error on demand
const ThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child-content">Child rendered successfully</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors during tests
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('Normal rendering', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Child rendered successfully')).toBeInTheDocument();
    });

    it('should render multiple children without errors', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display error UI when a child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should display fallback message when error has no message', () => {
      const NoMessageThrow: React.FC = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <NoMessageThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not render children when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    });
  });

  describe('Recovery', () => {
    it('should recover when Try Again button is clicked', async () => {
      // We need a component that can toggle between throwing and not
      let shouldThrow = true;
      const ToggleComponent: React.FC = () => {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div data-testid="recovered">Recovered content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ToggleComponent />
        </ErrorBoundary>
      );

      // Error state is shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Fix the "error" and click Try Again
      shouldThrow = false;
      await userEvent.click(screen.getByText('Try Again'));

      // Re-render to pick up the fixed component
      rerender(
        <ErrorBoundary>
          <ToggleComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('recovered')).toBeInTheDocument();
    });
  });
});
