/**
 * Financial List Screen (Invoices)
 *
 * Displays list of invoices with:
 * - Invoice cards with status and amounts
 * - Status filtering
 * - Search functionality
 * - Financial summary
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchInvoices,
  fetchFinancialAnalytics,
  selectInvoices,
  selectFinancialLoading,
  selectFinancialAnalytics,
  setFilters,
} from '../../store/slices/financialSlice';
import { showError } from '../../store/slices/uiSlice';
import { COLORS, SPACING, BORDER_RADIUS, STATUS_OPTIONS, BUSINESS_CONFIG } from '../../config';

export default function FinancialListScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const invoices = useAppSelector(selectInvoices);
  const analytics = useAppSelector(selectFinancialAnalytics);
  const isLoading = useAppSelector(selectFinancialLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const statusFilters = [
    { key: 'all', label: 'Semua' },
    ...STATUS_OPTIONS.INVOICE,
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    dispatch(setFilters({
      status: selectedStatus !== 'all' ? selectedStatus as any : undefined,
      search: searchQuery || undefined,
    }));
  }, [searchQuery, selectedStatus]);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchInvoices()).unwrap(),
        dispatch(fetchFinancialAnalytics()).unwrap(),
      ]);
    } catch (error: any) {
      dispatch(showError(error || 'Failed to load invoices'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredInvoices = invoices.filter(invoice => {
    let matches = true;

    if (selectedStatus !== 'all') {
      matches = matches && invoice.status === selectedStatus;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = matches && (
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.customer_name?.toLowerCase().includes(query)
      );
    }

    return matches;
  });

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.INVOICE.find(s => s.value === status);
    return statusOption?.color || COLORS.gray[500];
  };

  const getStatusLabel = (status: string) => {
    const statusOption = STATUS_OPTIONS.INVOICE.find(s => s.value === status);
    return statusOption?.label || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: BUSINESS_CONFIG.CURRENCY,
    }).format(amount);
  };

  const renderInvoiceCard = (invoice: any) => {
    const statusColor = getStatusColor(invoice.status);

    return (
      <TouchableOpacity
        key={invoice.id}
        style={styles.card}
        onPress={() => navigation.navigate('InvoiceDetails' as never, { invoiceId: invoice.id } as never)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusLabel(invoice.status)}</Text>
          </View>
        </View>

        {invoice.customer_name && (
          <Text style={styles.customerName}>{invoice.customer_name}</Text>
        )}

        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total:</Text>
          <Text style={styles.amountValue}>{formatCurrency(invoice.total_amount)}</Text>
        </View>

        {invoice.paid_amount > 0 && invoice.paid_amount < invoice.total_amount && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentText}>
              Dibayar: {formatCurrency(invoice.paid_amount)}
            </Text>
            <Text style={styles.remainingText}>
              Sisa: {formatCurrency(invoice.total_amount - invoice.paid_amount)}
            </Text>
          </View>
        )}

        <View style={styles.invoiceInfo}>
          {invoice.issue_date && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {new Date(invoice.issue_date).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}

          {invoice.due_date && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>⏰</Text>
              <Text style={styles.infoText}>
                Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && invoices.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data keuangan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Financial Summary */}
      {analytics && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatCurrency(analytics.totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Total Pendapatan</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatCurrency(analytics.outstandingBalance)}</Text>
            <Text style={styles.summaryLabel}>Piutang</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari invoice..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedStatus === filter.key && styles.filterChipActive,
            ]}
            onPress={() => setSelectedStatus(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Invoices List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada invoice ditemukan</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredInvoices.map(renderInvoiceCard)}
          </View>
        )}
      </ScrollView>

      {/* FAB - Create Invoice */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInvoice' as never)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  list: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  customerName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    marginTop: SPACING.sm,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  paymentText: {
    fontSize: 12,
    color: COLORS.success,
  },
  remainingText: {
    fontSize: 12,
    color: COLORS.warning,
  },
  invoiceInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },
});
