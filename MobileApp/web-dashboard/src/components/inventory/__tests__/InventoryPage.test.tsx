/**
 * Comprehensive tests for Inventory page components and helpers.
 *
 * Covers:
 *  - inventoryHelpers.ts  (pure-function unit tests)
 *  - InventoryFormModal   (render / validation / submit)
 *  - ConfirmDeleteDialog  (render / actions / states)
 *  - InventoryStats       (stat cards display)
 *  - InventoryTableRow    (row rendering / actions)
 *  - StockMovementModal   (render / form behaviour)
 *  - MovementHistoryModal (render / loading / data display)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';

// ─── Mocks (hoisted before component imports) ──────────────────────────

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('../../../contexts/ApiContext', () => ({
  useApi: () => ({
    getInventoryMovements: vi.fn().mockResolvedValue({ movements: [] }),
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', role: 'admin' },
    token: 'test-token',
  }),
}));

vi.mock('../../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock('../../../utils/formatters', () => ({
  formatCurrency: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
  formatDate: (val: string) => val,
  exportToCSV: vi.fn(),
}));

// ─── Component imports (after mocks) ───────────────────────────────────

import InventoryFormModal from '../InventoryFormModal';
import ConfirmDeleteDialog from '../../ConfirmDeleteDialog';
import InventoryStatsComponent from '../InventoryStats';
import InventoryTableRow from '../InventoryTableRow';
import StockMovementModal from '../StockMovementModal';
import MovementHistoryModal from '../MovementHistoryModal';

import {
  CATEGORIES,
  CATEGORY_I18N,
  MOVEMENT_TYPES,
  MOVEMENT_I18N,
  EMPTY_STATS,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  INPUT_LIMITS,
  isLowStock,
  isOutOfStock,
  getStockColor,
  getRowStockClass,
  getCategoryColor,
  getNewStock,
} from '../inventoryHelpers';

import type { InventoryItem } from '@shared/types/inventory';

// ─── Shared factories ──────────────────────────────────────────────────

const makeItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 'item-1',
  name: 'Brown Cardboard',
  category: 'cardboard',
  unit: 'pcs',
  unit_cost: 5000,
  current_stock: 100,
  reorder_level: 20,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
  ...overrides,
});

// ========================================================================
// 1. inventoryHelpers.ts  –  pure-function unit tests
// ========================================================================

describe('inventoryHelpers', () => {
  // ── CATEGORIES ──────────────────────────────────────────────────────

  test('CATEGORIES contains expected values', () => {
    expect(CATEGORIES).toEqual([
      'cardboard',
      'fabric',
      'ribbon',
      'accessories',
      'packaging',
      'tools',
    ]);
  });

  test('CATEGORIES has exactly 6 entries', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  // ── CATEGORY_I18N ──────────────────────────────────────────────────

  test('CATEGORY_I18N maps every category to an i18n key', () => {
    for (const cat of CATEGORIES) {
      expect(CATEGORY_I18N[cat]).toBeDefined();
      expect(typeof CATEGORY_I18N[cat]).toBe('string');
      expect(CATEGORY_I18N[cat]).toMatch(/^inventory\.cat/);
    }
  });

  // ── MOVEMENT_TYPES ─────────────────────────────────────────────────

  test('MOVEMENT_TYPES contains expected values', () => {
    expect(MOVEMENT_TYPES).toEqual(['purchase', 'usage', 'sale', 'adjustment', 'waste']);
  });

  test('MOVEMENT_TYPES has exactly 5 entries', () => {
    expect(MOVEMENT_TYPES).toHaveLength(5);
  });

  // ── MOVEMENT_I18N ──────────────────────────────────────────────────

  test('MOVEMENT_I18N maps every movement type to an i18n key', () => {
    for (const mt of MOVEMENT_TYPES) {
      expect(MOVEMENT_I18N[mt]).toBeDefined();
      expect(typeof MOVEMENT_I18N[mt]).toBe('string');
      expect(MOVEMENT_I18N[mt]).toMatch(/^inventory\.move/);
    }
  });

  // ── EMPTY_STATS ────────────────────────────────────────────────────

  test('EMPTY_STATS has expected shape and all zeros', () => {
    expect(EMPTY_STATS).toEqual({
      total: 0,
      cardboard: 0,
      fabric: 0,
      ribbon: 0,
      accessories: 0,
      packaging: 0,
      tools: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
    });
  });

  // ── PAGE_SIZE_OPTIONS / DEFAULT_PAGE_SIZE ──────────────────────────

  test('PAGE_SIZE_OPTIONS contains expected values', () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 25, 50, 100]);
  });

  test('DEFAULT_PAGE_SIZE is 25', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
  });

  // ── INPUT_LIMITS ──────────────────────────────────────────────────

  test('INPUT_LIMITS has expected values', () => {
    expect(INPUT_LIMITS.NAME_MAX).toBe(200);
    expect(INPUT_LIMITS.SUPPLIER_MAX).toBe(200);
    expect(INPUT_LIMITS.UNIT_MAX).toBe(50);
    expect(INPUT_LIMITS.NOTES_MAX).toBe(1000);
  });

  // ── Stock status helpers ──────────────────────────────────────────

  test('isLowStock returns true when stock > 0 and <= reorder_level', () => {
    expect(isLowStock(makeItem({ current_stock: 20, reorder_level: 20 }))).toBe(true);
    expect(isLowStock(makeItem({ current_stock: 10, reorder_level: 20 }))).toBe(true);
  });

  test('isLowStock returns false when stock > reorder_level', () => {
    expect(isLowStock(makeItem({ current_stock: 50, reorder_level: 20 }))).toBe(false);
  });

  test('isLowStock returns false when stock is 0', () => {
    expect(isLowStock(makeItem({ current_stock: 0, reorder_level: 20 }))).toBe(false);
  });

  test('isOutOfStock returns true when stock <= 0', () => {
    expect(isOutOfStock(makeItem({ current_stock: 0 }))).toBe(true);
    expect(isOutOfStock(makeItem({ current_stock: -1 }))).toBe(true);
  });

  test('isOutOfStock returns false when stock > 0', () => {
    expect(isOutOfStock(makeItem({ current_stock: 1 }))).toBe(false);
  });

  test('getStockColor returns correct class for each state', () => {
    expect(getStockColor(makeItem({ current_stock: 0 }))).toBe('text-red-600');
    expect(getStockColor(makeItem({ current_stock: 10, reorder_level: 20 }))).toBe(
      'text-orange-600'
    );
    expect(getStockColor(makeItem({ current_stock: 50, reorder_level: 20 }))).toBe('text-gray-900');
  });

  test('getRowStockClass returns correct class for each state', () => {
    expect(getRowStockClass(makeItem({ current_stock: 0 }))).toBe('bg-red-50/50');
    expect(getRowStockClass(makeItem({ current_stock: 10, reorder_level: 20 }))).toBe(
      'bg-yellow-50/50'
    );
    expect(getRowStockClass(makeItem({ current_stock: 50, reorder_level: 20 }))).toBe('');
  });

  // ── getCategoryColor ──────────────────────────────────────────────

  test('getCategoryColor returns correct classes for each category', () => {
    expect(getCategoryColor('cardboard')).toBe('bg-amber-50 text-amber-700');
    expect(getCategoryColor('fabric')).toBe('bg-purple-50 text-purple-700');
    expect(getCategoryColor('ribbon')).toBe('bg-pink-50 text-pink-700');
    expect(getCategoryColor('accessories')).toBe('bg-blue-50 text-blue-700');
    expect(getCategoryColor('packaging')).toBe('bg-teal-50 text-teal-700');
    expect(getCategoryColor('tools')).toBe('bg-gray-100 text-gray-700');
  });

  test('getCategoryColor returns fallback for unknown category', () => {
    expect(getCategoryColor('unknown')).toBe('bg-gray-50 text-gray-700');
  });

  // ── getNewStock ───────────────────────────────────────────────────

  test('getNewStock adds quantity for purchase', () => {
    expect(getNewStock(100, 'purchase', 50)).toBe(150);
  });

  test('getNewStock subtracts quantity for usage', () => {
    expect(getNewStock(100, 'usage', 30)).toBe(70);
  });

  test('getNewStock subtracts quantity for sale', () => {
    expect(getNewStock(100, 'sale', 25)).toBe(75);
  });

  test('getNewStock subtracts quantity for waste', () => {
    expect(getNewStock(100, 'waste', 10)).toBe(90);
  });

  test('getNewStock sets to quantity for adjustment', () => {
    expect(getNewStock(100, 'adjustment', 42)).toBe(42);
  });

  test('getNewStock returns current stock for unknown type', () => {
    expect(getNewStock(100, 'unknown', 50)).toBe(100);
  });
});

// ========================================================================
// 2. InventoryFormModal
// ========================================================================

describe('InventoryFormModal', () => {
  const defaultProps = {
    open: true,
    editingItem: null,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    saving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when open is false', () => {
    const { container } = render(<InventoryFormModal {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders the dialog when open is true', () => {
    render(<InventoryFormModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('shows "addMaterial" title when editingItem is null', () => {
    render(<InventoryFormModal {...defaultProps} />);
    expect(screen.getByText('inventory.addMaterial')).toBeInTheDocument();
  });

  test('shows "editMaterial" title when editingItem is provided', () => {
    const editingItem = {
      name: 'Fabric A',
      category: 'fabric',
      unit: 'meters',
      unit_cost: 10000,
      reorder_level: 5,
      current_stock: 50,
    };
    render(<InventoryFormModal {...defaultProps} editingItem={editingItem} />);
    expect(screen.getByText('inventory.editMaterial')).toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<InventoryFormModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<InventoryFormModal {...defaultProps} onClose={onClose} />);
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does NOT call onClose when inner modal content is clicked', () => {
    const onClose = vi.fn();
    render(<InventoryFormModal {...defaultProps} onClose={onClose} />);
    const title = screen.getByText('inventory.addMaterial');
    fireEvent.click(title);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('calls onSave with correct payload when form is submitted with valid data', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InventoryFormModal {...defaultProps} onSave={onSave} />);

    // Fill name field
    fireEvent.change(screen.getByLabelText(/inventory\.name/), {
      target: { value: 'New Material' },
    });
    // Fill unit cost
    fireEvent.change(screen.getByLabelText(/inventory\.unitCost/), {
      target: { value: '5000' },
    });
    // Fill reorder level
    fireEvent.change(screen.getByLabelText(/inventory\.reorderLevel/), {
      target: { value: '10' },
    });
    // Fill current stock
    fireEvent.change(screen.getByLabelText(/inventory\.currentStock/), {
      target: { value: '100' },
    });

    // Click the save/create button (the second button in the footer)
    const buttons = screen.getAllByRole('button');
    const createButton = buttons.find((b) => b.textContent === 'inventory.create');
    expect(createButton).toBeDefined();
    fireEvent.click(createButton!);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const payload = onSave.mock.calls[0][0];
    expect(payload.name).toBe('New Material');
    expect(payload.unit_cost).toBe(5000);
    expect(payload.reorder_level).toBe(10);
    expect(payload.current_stock).toBe(100);
    expect(payload.category).toBe('cardboard'); // default
    expect(payload.unit).toBe('pcs'); // default
  });

  test('shows validation error when name is empty on submit', async () => {
    const onSave = vi.fn();
    render(<InventoryFormModal {...defaultProps} onSave={onSave} />);

    // Clear name and try to submit -- the save button should be disabled
    fireEvent.change(screen.getByLabelText(/inventory\.name/), {
      target: { value: '' },
    });

    // The create button should be disabled
    const buttons = screen.getAllByRole('button');
    const createButton = buttons.find((b) => b.textContent === 'inventory.create');
    expect(createButton).toBeDisabled();

    // onSave should NOT have been called
    expect(onSave).not.toHaveBeenCalled();
  });

  test('disables save button when name is empty', () => {
    render(<InventoryFormModal {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const createButton = buttons.find((b) => b.textContent === 'inventory.create');
    expect(createButton).toBeDisabled();
  });

  test('pre-fills form fields when editingItem is provided', () => {
    const editingItem = {
      name: 'Silk Fabric',
      category: 'fabric',
      unit: 'meters',
      unit_cost: 12000,
      reorder_level: 10,
      current_stock: 75,
      supplier: 'Supplier X',
      notes: 'Premium quality',
    };
    render(<InventoryFormModal {...defaultProps} editingItem={editingItem} />);

    expect(screen.getByLabelText(/inventory\.name/)).toHaveValue('Silk Fabric');
    expect(screen.getByLabelText(/inventory\.unit\b/)).toHaveValue('meters');
    expect(screen.getByLabelText(/inventory\.unitCost/)).toHaveValue(12000);
    expect(screen.getByLabelText(/inventory\.reorderLevel/)).toHaveValue(10);
    expect(screen.getByLabelText(/inventory\.currentStock/)).toHaveValue(75);
    expect(screen.getByLabelText(/inventory\.supplier/)).toHaveValue('Supplier X');
    expect(screen.getByLabelText(/inventory\.notes/)).toHaveValue('Premium quality');
  });

  test('handles zero unit_cost correctly (should show 0, not empty)', () => {
    const editingItem = {
      name: 'Free Item',
      category: 'cardboard',
      unit: 'pcs',
      unit_cost: 0,
      reorder_level: 5,
      current_stock: 10,
    };
    render(<InventoryFormModal {...defaultProps} editingItem={editingItem} />);

    // unit_cost of 0 is stringified as "0" in buildInitialFormData
    expect(screen.getByLabelText(/inventory\.unitCost/)).toHaveValue(0);
  });

  test('shows "update" button text when editingItem is provided', () => {
    const editingItem = {
      name: 'Test',
      category: 'fabric',
      unit: 'pcs',
      unit_cost: 100,
      reorder_level: 5,
      current_stock: 50,
    };
    render(<InventoryFormModal {...defaultProps} editingItem={editingItem} />);
    const buttons = screen.getAllByRole('button');
    const updateButton = buttons.find((b) => b.textContent === 'inventory.update');
    expect(updateButton).toBeDefined();
  });

  test('shows "saving" text when saving prop is true', () => {
    render(
      <InventoryFormModal
        {...defaultProps}
        saving={true}
        editingItem={{
          name: 'Test',
          category: 'fabric',
          unit: 'pcs',
          unit_cost: 100,
          reorder_level: 5,
          current_stock: 50,
        }}
      />
    );

    // Fill in name so the button text is visible (not disabled by empty name)
    expect(screen.getByText('inventory.saving')).toBeInTheDocument();
  });
});

// ========================================================================
// 3. ConfirmDeleteDialog
// ========================================================================

describe('ConfirmDeleteDialog', () => {
  const defaultProps = {
    itemLabel: 'Brown Cardboard',
    deleting: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders item label in the dialog message', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);
    expect(screen.getByText(/Brown Cardboard/)).toBeInTheDocument();
  });

  test('calls onConfirm when delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />);
    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((b) => b.textContent === 'common.delete');
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDeleteDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('common.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('shows deleting state text and disables buttons', () => {
    render(<ConfirmDeleteDialog {...defaultProps} deleting={true} />);
    expect(screen.getByText('common.deleting')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  test('shows error message when error prop is provided', () => {
    render(<ConfirmDeleteDialog {...defaultProps} error="Failed to delete" />);
    expect(screen.getByText('Failed to delete')).toBeInTheDocument();
  });

  test('does not show error element when error is null', () => {
    render(<ConfirmDeleteDialog {...defaultProps} error={null} />);
    expect(screen.queryByText('Failed to delete')).not.toBeInTheDocument();
  });

  test('displays custom description when description prop is provided', () => {
    render(
      <ConfirmDeleteDialog {...defaultProps} description="This will permanently remove the item." />
    );
    expect(screen.getByText('This will permanently remove the item.')).toBeInTheDocument();
  });

  test('has proper ARIA attributes', () => {
    render(<ConfirmDeleteDialog {...defaultProps} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});

// ========================================================================
// 4. InventoryStats
// ========================================================================

describe('InventoryStats', () => {
  const stats = {
    total: 150,
    cardboard: 30,
    fabric: 25,
    ribbon: 20,
    accessories: 25,
    packaging: 30,
    tools: 20,
    lowStock: 5,
    outOfStock: 2,
    totalValue: 5000000,
  };

  test('renders all four stat cards', () => {
    render(<InventoryStatsComponent stats={stats} hasFilters={false} reorderAlertCount={0} />);

    expect(screen.getByText('inventory.totalItems')).toBeInTheDocument();
    expect(screen.getByText('inventory.lowStock')).toBeInTheDocument();
    expect(screen.getByText('inventory.outOfStock')).toBeInTheDocument();
    expect(screen.getByText('inventory.totalValue')).toBeInTheDocument();
  });

  test('shows correct values from stats prop', () => {
    render(<InventoryStatsComponent stats={stats} hasFilters={false} reorderAlertCount={0} />);

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // formatCurrency mock outputs "Rp 5.000.000"
    expect(screen.getByText(/Rp/)).toBeInTheDocument();
  });

  test('shows reorder alert count when > 0', () => {
    render(<InventoryStatsComponent stats={stats} hasFilters={false} reorderAlertCount={3} />);

    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/inventory\.pendingAlerts/)).toBeInTheDocument();
  });

  test('does not show pending alerts when reorderAlertCount is 0', () => {
    render(<InventoryStatsComponent stats={stats} hasFilters={false} reorderAlertCount={0} />);
    expect(screen.queryByText('inventory.pendingAlerts')).not.toBeInTheDocument();
  });

  test('shows "overallStats" text when hasFilters is true', () => {
    render(<InventoryStatsComponent stats={stats} hasFilters={true} reorderAlertCount={0} />);
    expect(screen.getByText('inventory.overallStats')).toBeInTheDocument();
  });

  test('does not show "overallStats" when hasFilters is false', () => {
    render(<InventoryStatsComponent stats={stats} hasFilters={false} reorderAlertCount={0} />);
    expect(screen.queryByText('inventory.overallStats')).not.toBeInTheDocument();
  });
});

// ========================================================================
// 5. InventoryTableRow
// ========================================================================

describe('InventoryTableRow', () => {
  const item = makeItem();

  const defaultProps = {
    item,
    canDelete: true,
    selected: false,
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onMovement: vi.fn(),
    onHistory: vi.fn(),
    onDelete: vi.fn(),
  };

  const renderRow = (props = defaultProps) =>
    render(
      <table>
        <tbody>
          <InventoryTableRow {...props} />
        </tbody>
      </table>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders item name', () => {
    renderRow();
    expect(screen.getByText('Brown Cardboard')).toBeInTheDocument();
  });

  test('renders supplier when present', () => {
    renderRow({
      ...defaultProps,
      item: makeItem({ supplier: 'PT Paper Co' }),
    });
    expect(screen.getByText('PT Paper Co')).toBeInTheDocument();
  });

  test('renders "inStock" badge when stock is healthy', () => {
    renderRow();
    expect(screen.getByText('inventory.inStock')).toBeInTheDocument();
  });

  test('renders "lowStock" badge when stock is low', () => {
    renderRow({
      ...defaultProps,
      item: makeItem({ current_stock: 15, reorder_level: 20 }),
    });
    expect(screen.getByText('inventory.lowStock')).toBeInTheDocument();
  });

  test('renders "outOfStock" badge when stock is 0', () => {
    renderRow({
      ...defaultProps,
      item: makeItem({ current_stock: 0 }),
    });
    expect(screen.getByText('inventory.outOfStock')).toBeInTheDocument();
  });

  test('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    renderRow({ ...defaultProps, onEdit });
    const editBtn = screen.getByTitle('common.edit');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(item);
  });

  test('calls onMovement when stock movement button is clicked', () => {
    const onMovement = vi.fn();
    renderRow({ ...defaultProps, onMovement });
    const moveBtn = screen.getByTitle('inventory.stockMovement');
    fireEvent.click(moveBtn);
    expect(onMovement).toHaveBeenCalledWith(item);
  });

  test('calls onHistory when history button is clicked', () => {
    const onHistory = vi.fn();
    renderRow({ ...defaultProps, onHistory });
    const historyBtn = screen.getByTitle('inventory.movementHistory');
    fireEvent.click(historyBtn);
    expect(onHistory).toHaveBeenCalledWith(item);
  });

  test('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    renderRow({ ...defaultProps, onDelete });
    const deleteBtn = screen.getByTitle('common.delete');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('item-1');
  });

  test('does not render delete button when canDelete is false', () => {
    renderRow({ ...defaultProps, canDelete: false });
    expect(screen.queryByTitle('common.delete')).not.toBeInTheDocument();
  });

  test('checkbox reflects selected state', () => {
    renderRow({ ...defaultProps, selected: true });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  test('calls onSelect when checkbox is toggled', () => {
    const onSelect = vi.fn();
    renderRow({ ...defaultProps, onSelect });
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onSelect).toHaveBeenCalledWith('item-1', true);
  });
});

// ========================================================================
// 6. StockMovementModal
// ========================================================================

describe('StockMovementModal', () => {
  const movementItem = { id: 'item-1', name: 'Brown Cardboard', current_stock: 100, unit: 'pcs' };

  const defaultProps = {
    item: movementItem,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    saving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when item is null', () => {
    const { container } = render(<StockMovementModal {...defaultProps} item={null} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders the dialog when item is provided', () => {
    render(<StockMovementModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('shows item name in header', () => {
    render(<StockMovementModal {...defaultProps} />);
    expect(screen.getByText(/Brown Cardboard/)).toBeInTheDocument();
  });

  test('shows current stock info in header', () => {
    render(<StockMovementModal {...defaultProps} />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  test('has movement type select with all movement types', () => {
    render(<StockMovementModal {...defaultProps} />);
    const select = screen.getByLabelText(/inventory\.movementType/);
    expect(select).toBeInTheDocument();

    const options = within(select as HTMLElement).getAllByRole('option');
    expect(options).toHaveLength(MOVEMENT_TYPES.length);
  });

  test('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<StockMovementModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ========================================================================
// 7. MovementHistoryModal
// ========================================================================

describe('MovementHistoryModal', () => {
  const historyItem = { id: 'item-1', name: 'Brown Cardboard', unit: 'pcs' };

  const defaultProps = {
    item: historyItem,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when item is null', () => {
    const { container } = render(<MovementHistoryModal {...defaultProps} item={null} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders the dialog when item is provided', () => {
    render(<MovementHistoryModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('shows "movementHistory" title', () => {
    render(<MovementHistoryModal {...defaultProps} />);
    expect(screen.getByText('inventory.movementHistory')).toBeInTheDocument();
  });

  test('shows item name in header', () => {
    render(<MovementHistoryModal {...defaultProps} />);
    expect(screen.getByText('Brown Cardboard')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<MovementHistoryModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('common.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows empty state when no movements are loaded', async () => {
    render(<MovementHistoryModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('inventory.noMovements')).toBeInTheDocument();
    });
  });
});
