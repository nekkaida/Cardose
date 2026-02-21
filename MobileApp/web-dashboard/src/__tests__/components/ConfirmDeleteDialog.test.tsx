/**
 * ConfirmDeleteDialog Unit Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.delete': 'Delete',
        'common.deleting': 'Deleting...',
        'common.cancel': 'Cancel',
        'common.confirmDeleteGeneric': 'Are you sure you want to delete',
        'orders.deleteOrder': 'Delete Order',
        'orders.confirmDelete': 'This will permanently delete this order.',
      };
      return translations[key] || key;
    },
  }),
}));

const defaultProps = {
  itemLabel: 'Test Item',
  deleting: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default title and generic message', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // "Delete" appears in both the title and the button
    expect(screen.getAllByText('Delete').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Are you sure you want to delete "Test Item"\?/)).toBeInTheDocument();
  });

  it('should render with custom titleKey and descriptionKey', () => {
    render(
      <ConfirmDeleteDialog
        {...defaultProps}
        titleKey="orders.deleteOrder"
        descriptionKey="orders.confirmDelete"
      />
    );

    expect(screen.getByText('Delete Order')).toBeInTheDocument();
    expect(screen.getByText('This will permanently delete this order.')).toBeInTheDocument();
  });

  it('should show Delete button text by default', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((b) => b.textContent === 'Delete');
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).not.toBeDisabled();
  });

  it('should show Deleting... and disable buttons when deleting=true', () => {
    render(<ConfirmDeleteDialog {...defaultProps} deleting={true} />);

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('should call onConfirm when Delete button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />);

    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((b) => b.textContent === 'Delete');
    await userEvent.click(deleteBtn!);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when ESC key is pressed', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onCancel={onCancel} />);

    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onCancel on ESC when deleting', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onCancel={onCancel} deleting={true} />);

    await userEvent.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when clicking backdrop', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onCancel={onCancel} />);

    const backdrop = screen.getByRole('alertdialog');
    // Click the backdrop itself (not a child element)
    await userEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should display inline error when error prop is set', () => {
    render(<ConfirmDeleteDialog {...defaultProps} error="Network error occurred" />);

    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('should not display error when error prop is null', () => {
    render(<ConfirmDeleteDialog {...defaultProps} error={null} />);

    expect(screen.queryByText('Network error occurred')).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<ConfirmDeleteDialog {...defaultProps} titleKey="orders.deleteOrder" />);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Delete Order');
  });

  it('should focus Cancel button on mount', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/ });
    expect(cancelBtn).toHaveFocus();
  });
});
