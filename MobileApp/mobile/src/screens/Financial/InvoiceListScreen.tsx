import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Card, Chip, FAB, Searchbar, Menu, Button } from 'react-native-paper';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import { theme } from '../../theme/theme';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  subtotal: number;
  discount: number;
  ppn_rate: number;
  ppn_amount: number;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  created_at: string;
}

export const InvoiceListScreen: React.FC = ({ navigation }: any) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchQuery, statusFilter, invoices]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await authenticatedFetch(`/financial/invoices?${params}`);
      const data = await response.json();

      if (response.ok) {
        setInvoices(data.invoices || []);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch invoices');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error fetching invoices');
      console.error('Fetch invoices error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number.toLowerCase().includes(query) ||
          invoice.customer_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInvoices(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setFilterMenuVisible(false);
    setRefreshing(true);
    fetchInvoices();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'unpaid':
        return '#FF9800';
      case 'overdue':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderInvoiceItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
            <Chip
              style={{ backgroundColor: getStatusColor(item.status) }}
              textStyle={styles.chipText}
            >
              {item.status.toUpperCase()}
            </Chip>
          </View>

          {item.customer_name && (
            <Text style={styles.customerName}>{item.customer_name}</Text>
          )}

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Subtotal:</Text>
              <Text style={styles.value}>{formatCurrency(item.subtotal)}</Text>
            </View>

            {item.discount > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Discount:</Text>
                <Text style={[styles.value, styles.discount]}>
                  -{formatCurrency(item.discount)}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.label}>PPN ({item.ppn_rate}%):</Text>
              <Text style={styles.value}>{formatCurrency(item.ppn_amount)}</Text>
            </View>

            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatCurrency(item.total_amount)}</Text>
            </View>
          </View>

          <View style={styles.dates}>
            <Text style={styles.dateText}>
              Issue: {formatDate(item.issue_date)}
            </Text>
            {item.due_date && (
              <Text style={styles.dateText}>Due: {formatDate(item.due_date)}</Text>
            )}
            {item.paid_date && (
              <Text style={styles.dateText}>Paid: {formatDate(item.paid_date)}</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No invoices found</Text>
      <Text style={styles.emptySubtext}>
        {statusFilter
          ? `No ${statusFilter} invoices`
          : 'Create your first invoice to get started'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search invoices..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setFilterMenuVisible(true)}
              style={styles.filterButton}
            >
              {statusFilter ? statusFilter.toUpperCase() : 'ALL'}
            </Button>
          }
        >
          <Menu.Item onPress={() => handleStatusFilter(null)} title="All" />
          <Menu.Item onPress={() => handleStatusFilter('unpaid')} title="Unpaid" />
          <Menu.Item onPress={() => handleStatusFilter('paid')} title="Paid" />
          <Menu.Item onPress={() => handleStatusFilter('overdue')} title="Overdue" />
          <Menu.Item onPress={() => handleStatusFilter('cancelled')} title="Cancelled" />
        </Menu>
      </View>

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!loading ? renderEmpty : null}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateInvoice')}
        label="New Invoice"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
  },
  filterButton: {
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  cardDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  discount: {
    color: '#4CAF50',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  dates: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
