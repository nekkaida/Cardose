/**
 * StatusBoard component render tests.
 *
 * Tests the four leaf components:
 * - EmptyState: contextual empty messaging
 * - ErrorState: error display with retry
 * - OrderCard: order info, badges, overdue, actions
 * - StatusChangeModal: transition partitioning, terminal state
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Order } from '../../../screens/StatusBoard/types';
import { ORDER_STATUSES } from '../../../screens/StatusBoard/types';

// Mock react-native-paper - must provide DefaultTheme for theme.ts spreading
jest.mock('react-native-paper', () => {
  const { View } = require('react-native');
  const actualPaper = jest.requireActual('react-native-paper');
  return {
    ...actualPaper,
    Icon: ({ source, ...props }: { source: string; size: number; color: string }) => (
      <View testID={`icon-${source}`} {...props} />
    ),
    PaperProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ─── Test data ───────────────────────────────────────────────────

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  order_number: 'ORD-001',
  customer_name: 'Budi Santoso',
  status: 'pending',
  priority: 'normal',
  total_amount: 150000,
  box_type: 'premium',
  due_date: '2099-12-31',
  ...overrides,
});

// ─── EmptyState ──────────────────────────────────────────────────

describe('EmptyState', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const EmptyState = require('../../../screens/StatusBoard/components/EmptyState').default;

  it('renders "no orders" message when hasFilters is false', () => {
    const { getByText } = render(<EmptyState />);
    expect(getByText('Belum Ada Pesanan')).toBeTruthy();
    expect(getByText('Buat pesanan baru melalui web dashboard')).toBeTruthy();
  });

  it('renders "no results" message when hasFilters is true', () => {
    const { getByText } = render(<EmptyState hasFilters />);
    expect(getByText('Tidak Ada Hasil')).toBeTruthy();
    expect(getByText('Coba ubah filter atau kata pencarian Anda')).toBeTruthy();
  });

  it('uses clipboard icon when no filters', () => {
    const { getByTestId } = render(<EmptyState />);
    expect(getByTestId('icon-clipboard-text-outline')).toBeTruthy();
  });

  it('uses search icon when filters active', () => {
    const { getByTestId } = render(<EmptyState hasFilters />);
    expect(getByTestId('icon-magnify-close')).toBeTruthy();
  });
});

// ─── ErrorState ──────────────────────────────────────────────────

describe('ErrorState', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ErrorState = require('../../../screens/StatusBoard/components/ErrorState').default;

  it('renders default error message', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorState onRetry={onRetry} />);
    expect(getByText('Gagal Memuat')).toBeTruthy();
    expect(getByText('Tidak dapat memuat data. Periksa koneksi internet Anda.')).toBeTruthy();
  });

  it('renders custom error message', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorState message="Server error" onRetry={onRetry} />);
    expect(getByText('Server error')).toBeTruthy();
  });

  it('calls onRetry when retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(getByText('Coba Lagi'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders alert icon', () => {
    const onRetry = jest.fn();
    const { getByTestId } = render(<ErrorState onRetry={onRetry} />);
    expect(getByTestId('icon-alert-circle-outline')).toBeTruthy();
  });
});

// ─── OrderCard ───────────────────────────────────────────────────

describe('OrderCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OrderCard = require('../../../screens/StatusBoard/components/OrderCard').default;

  const defaultProps = {
    order: makeOrder(),
    onPress: jest.fn(),
    onPhotos: jest.fn(),
    onQualityCheck: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order number and customer name', () => {
    const { getByText } = render(<OrderCard {...defaultProps} />);
    expect(getByText('ORD-001')).toBeTruthy();
    expect(getByText('Budi Santoso')).toBeTruthy();
  });

  it('renders "-" when customer_name is null', () => {
    const order = makeOrder({ customer_name: null });
    const { getByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(getByText('-')).toBeTruthy();
  });

  it('renders box type', () => {
    const { getByText } = render(<OrderCard {...defaultProps} />);
    expect(getByText('premium')).toBeTruthy();
  });

  it('renders "Standard" when box_type is null', () => {
    const order = makeOrder({ box_type: null });
    const { getByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(getByText('Standard')).toBeTruthy();
  });

  it('renders due date', () => {
    const { getByText } = render(<OrderCard {...defaultProps} />);
    // Should contain "Tenggat:" prefix
    expect(getByText(/Tenggat:/)).toBeTruthy();
  });

  it('does not render due date when missing', () => {
    const order = makeOrder({ due_date: null });
    const { queryByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(queryByText(/Tenggat:/)).toBeNull();
  });

  it('shows priority badge for high priority', () => {
    const order = makeOrder({ priority: 'high' });
    const { getByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(getByText('TINGGI')).toBeTruthy();
  });

  it('shows priority badge for urgent priority', () => {
    const order = makeOrder({ priority: 'urgent' });
    const { getByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(getByText('MENDESAK')).toBeTruthy();
  });

  it('does not show priority badge for normal priority', () => {
    const { queryByText } = render(<OrderCard {...defaultProps} />);
    expect(queryByText('NORMAL')).toBeNull();
  });

  it('shows TERLAMBAT badge for overdue orders', () => {
    const order = makeOrder({ due_date: '2020-01-01', status: 'pending' });
    const { getByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(getByText('TERLAMBAT')).toBeTruthy();
  });

  it('does not show TERLAMBAT for completed overdue orders', () => {
    const order = makeOrder({ due_date: '2020-01-01', status: 'completed' });
    const { queryByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(queryByText('TERLAMBAT')).toBeNull();
  });

  it('does not show TERLAMBAT for cancelled overdue orders', () => {
    const order = makeOrder({ due_date: '2020-01-01', status: 'cancelled' });
    const { queryByText } = render(<OrderCard {...defaultProps} order={order} />);
    expect(queryByText('TERLAMBAT')).toBeNull();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <OrderCard {...defaultProps} onPress={onPress} />,
    );
    fireEvent.press(getByLabelText(/Pesanan ORD-001/));
    expect(onPress).toHaveBeenCalledWith(defaultProps.order);
  });

  it('calls onPhotos when Foto button is pressed', () => {
    const onPhotos = jest.fn();
    const { getByLabelText } = render(
      <OrderCard {...defaultProps} onPhotos={onPhotos} />,
    );
    fireEvent.press(getByLabelText(/Lihat foto pesanan ORD-001/));
    expect(onPhotos).toHaveBeenCalledWith(defaultProps.order);
  });

  it('calls onQualityCheck when QC button is pressed', () => {
    const onQualityCheck = jest.fn();
    const { getByLabelText } = render(
      <OrderCard {...defaultProps} onQualityCheck={onQualityCheck} />,
    );
    fireEvent.press(getByLabelText(/Quality check pesanan ORD-001/));
    expect(onQualityCheck).toHaveBeenCalledWith(defaultProps.order);
  });

  it('renders currency for total_amount > 0', () => {
    const { getByText } = render(<OrderCard {...defaultProps} />);
    // formatCurrency(150000) should produce something with "150" in it
    expect(getByText(/150/)).toBeTruthy();
  });

  it('does not render currency when total_amount is 0', () => {
    const order = makeOrder({ total_amount: 0 });
    const { queryByText } = render(<OrderCard {...defaultProps} order={order} />);
    // Should not show Rp0 or any currency text
    expect(queryByText(/Rp/)).toBeNull();
  });
});

// ─── StatusChangeModal ───────────────────────────────────────────

describe('StatusChangeModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const StatusChangeModal = require('../../../screens/StatusBoard/components/StatusChangeModal').default;

  const defaultProps = {
    visible: true,
    order: makeOrder({ status: 'pending' }),
    statuses: ORDER_STATUSES,
    isUpdating: false,
    onStatusChange: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal title', () => {
    const { getByText } = render(<StatusChangeModal {...defaultProps} />);
    expect(getByText('Ubah Status')).toBeTruthy();
  });

  it('renders order number and customer name', () => {
    const { getByText } = render(<StatusChangeModal {...defaultProps} />);
    expect(getByText('ORD-001 — Budi Santoso')).toBeTruthy();
  });

  it('shows current status indicator', () => {
    const { getByText } = render(<StatusChangeModal {...defaultProps} />);
    expect(getByText('Menunggu')).toBeTruthy();
    expect(getByText('Saat ini')).toBeTruthy();
  });

  it('shows "Langkah Selanjutnya" section for valid transitions', () => {
    const { getByText } = render(<StatusChangeModal {...defaultProps} />);
    // pending can transition to designing and cancelled
    expect(getByText('Langkah Selanjutnya')).toBeTruthy();
    expect(getByText('Desain')).toBeTruthy();
  });

  it('shows "Lainnya" section for non-standard transitions', () => {
    const { getByText } = render(<StatusChangeModal {...defaultProps} />);
    expect(getByText('Lainnya')).toBeTruthy();
  });

  it('calls onStatusChange when a transition option is pressed', () => {
    const onStatusChange = jest.fn();
    const { getByText } = render(
      <StatusChangeModal {...defaultProps} onStatusChange={onStatusChange} />,
    );
    fireEvent.press(getByText('Desain'));
    expect(onStatusChange).toHaveBeenCalledWith('designing');
  });

  it('calls onClose when Batal is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <StatusChangeModal {...defaultProps} onClose={onClose} />,
    );
    fireEvent.press(getByText('Batal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows terminal message for completed orders', () => {
    const order = makeOrder({ status: 'completed' });
    const { getByText } = render(
      <StatusChangeModal {...defaultProps} order={order} />,
    );
    expect(
      getByText('Pesanan ini sudah final dan tidak dapat diubah statusnya.'),
    ).toBeTruthy();
  });

  it('shows spinner when isUpdating is true', () => {
    const { UNSAFE_queryByType } = render(
      <StatusChangeModal {...defaultProps} isUpdating />,
    );
    // ActivityIndicator should be rendered
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders without crashing when order is null', () => {
    const { getByText } = render(
      <StatusChangeModal {...defaultProps} order={null} />,
    );
    expect(getByText('Ubah Status')).toBeTruthy();
  });
});
