import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Searchbar,
  FAB,
  List,
  Avatar,
  IconButton,
  Badge,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCustomers,
  selectCustomers,
  selectCustomersLoading,
  setFilters,
  selectCustomersFilters
} from '../../store/slices/customersSlice';
import { Customer, BusinessType } from '../../types/Customer';
import { formatCurrency, formatDate, formatPhoneNumber, titleCase } from '../../utils/formatters';
import { CustomersStackParamList } from '../../navigation/CustomersNavigator';

const BUSINESS_TYPES = [
  { key: 'all', label: 'All Types', color: '#666', icon: 'account-group' },
  { key: 'individual', label: 'Individual', color: '#4caf50', icon: 'account' },
  { key: 'corporate', label: 'Corporate', color: '#2196f3', icon: 'office-building' },
  { key: 'wedding', label: 'Wedding', color: '#e91e63', icon: 'heart' },
  { key: 'event', label: 'Event', color: '#9c27b0', icon: 'calendar-star' }
];

const LOYALTY_LEVELS = {
  new: { label: 'New', color: '#ff9800', icon: 'star-outline' },
  regular: { label: 'Regular', color: '#4caf50', icon: 'star-half-full' },
  vip: { label: 'VIP', color: '#FFD700', icon: 'star' }
};

export default function CustomersScreen() {
  const navigation = useNavigation<NavigationProp<CustomersStackParamList>>();
  const dispatch = useAppDispatch();

  // Redux state
  const customers = useAppSelector(selectCustomers);
  const loading = useAppSelector(selectCustomersLoading);
  const filters = useAppSelector(selectCustomersFilters);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState('all');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Update Redux filters when local state changes
    dispatch(setFilters({
      type: selectedBusinessType !== 'all' ? selectedBusinessType as any : undefined,
      search: searchQuery || undefined
    }));
  }, [searchQuery, selectedBusinessType]);

  const loadCustomers = async () => {
    try {
      await dispatch(fetchCustomers()).unwrap();
    } catch (error) {
      console.error('Failed to load customers:', error);
      Alert.alert('Error', 'Failed to load customers. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  // Use filtered customers from Redux selector
  const filteredCustomers = useAppSelector(state => {
    let filtered = [...customers];

    if (selectedBusinessType !== 'all') {
      filtered = filtered.filter(customer => customer.type === selectedBusinessType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.company_name?.toLowerCase().includes(query)
      );
    }

    // Sort by created date (most recent first)
    filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0);
      const bDate = new Date(b.created_at || 0);
      return bDate.getTime() - aDate.getTime();
    });

    return filtered;
  });

  const getBusinessTypeConfig = (type: BusinessType) => {
    return BUSINESS_TYPES.find(bt => bt.key === type) || BUSINESS_TYPES[0];
  };

  const getLoyaltyConfig = (loyalty: string) => {
    return LOYALTY_LEVELS[loyalty as keyof typeof LOYALTY_LEVELS] || LOYALTY_LEVELS.new;
  };

  const handleCallCustomer = (phone: string) => {
    if (phone) {
      Alert.alert(
        'Call Customer',
        `Call ${formatPhoneNumber(phone)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => {
            // Here you would integrate with phone calling
            console.log('Calling:', phone);
          }}
        ]
      );
    }
  };

  const handleWhatsAppCustomer = (whatsapp: string) => {
    if (whatsapp) {
      Alert.alert(
        'WhatsApp Customer',
        `Send WhatsApp to ${formatPhoneNumber(whatsapp)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open WhatsApp', onPress: () => {
            // Here you would integrate with WhatsApp
            console.log('WhatsApp:', whatsapp);
          }}
        ]
      );
    }
  };

  const renderCustomerCard = (customer: Customer) => {
    const businessTypeConfig = getBusinessTypeConfig(customer.business_type);
    const loyaltyConfig = getLoyaltyConfig(customer.loyalty_status || 'new');

    return (
      <Card 
        key={customer.id} 
        style={styles.customerCard}
        onPress={() => navigation.navigate('CustomerDetails', { customerId: customer.id })}
      >
        <Card.Content>
          {/* Customer Header */}
          <View style={styles.customerHeader}>
            <View style={styles.customerInfo}>
              <View style={styles.nameContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon={businessTypeConfig.icon} 
                  style={{ backgroundColor: businessTypeConfig.color }}
                />
                <View style={styles.nameAndCompany}>
                  <Title style={styles.customerName}>{customer.name}</Title>
                  {customer.company_name && (
                    <Paragraph style={styles.companyName}>{customer.company_name}</Paragraph>
                  )}
                </View>
              </View>
              
              <View style={styles.badges}>
                <Chip 
                  mode="outlined" 
                  compact
                  textStyle={{ color: businessTypeConfig.color, fontSize: 10 }}
                  style={{ borderColor: businessTypeConfig.color, marginBottom: 4 }}
                >
                  {businessTypeConfig.label}
                </Chip>
                <Chip 
                  mode="outlined" 
                  compact
                  textStyle={{ color: loyaltyConfig.color, fontSize: 10 }}
                  style={{ borderColor: loyaltyConfig.color }}
                >
                  {loyaltyConfig.label}
                </Chip>
              </View>
            </View>
          </View>

          {/* Customer Details */}
          <View style={styles.customerDetails}>
            {/* Contact Information */}
            <View style={styles.contactRow}>
              {customer.whatsapp && (
                <List.Item
                  title={formatPhoneNumber(customer.whatsapp)}
                  description="WhatsApp"
                  left={() => <List.Icon icon="whatsapp" color="#25D366" />}
                  onPress={() => handleWhatsAppCustomer(customer.whatsapp!)}
                  style={styles.contactItem}
                  titleStyle={styles.contactTitle}
                  descriptionStyle={styles.contactDescription}
                />
              )}
              
              {customer.phone && (
                <List.Item
                  title={formatPhoneNumber(customer.phone)}
                  description="Phone"
                  left={() => <List.Icon icon="phone" color="#2196f3" />}
                  onPress={() => handleCallCustomer(customer.phone!)}
                  style={styles.contactItem}
                  titleStyle={styles.contactTitle}
                  descriptionStyle={styles.contactDescription}
                />
              )}
            </View>

            {customer.email && (
              <List.Item
                title={customer.email}
                description="Email"
                left={() => <List.Icon icon="email" color="#ff9800" />}
                style={styles.fullWidthContact}
                titleStyle={styles.contactTitle}
                descriptionStyle={styles.contactDescription}
              />
            )}

            <Divider style={styles.divider} />

            {/* Order Statistics */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{customer.total_orders || 0}</Title>
                <Paragraph style={styles.statLabel}>Orders</Paragraph>
              </View>
              
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>
                  {formatCurrency(customer.total_value || 0, 'IDR', { compact: true })}
                </Title>
                <Paragraph style={styles.statLabel}>Total Value</Paragraph>
              </View>
              
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>
                  {formatCurrency(customer.average_order_value || 0, 'IDR', { compact: true })}
                </Title>
                <Paragraph style={styles.statLabel}>Avg. Order</Paragraph>
              </View>
            </View>

            {customer.last_order_date && (
              <View style={styles.lastOrderContainer}>
                <List.Item
                  title={`Last order: ${formatDate(customer.last_order_date)}`}
                  description="Most recent order date"
                  left={() => <List.Icon icon="calendar-clock" />}
                  titleStyle={styles.lastOrderText}
                  descriptionStyle={styles.contactDescription}
                />
              </View>
            )}

            {/* Customer Preferences */}
            {(customer.preferred_materials?.length || customer.preferred_colors?.length) && (
              <View style={styles.preferencesContainer}>
                <Paragraph style={styles.preferencesTitle}>Preferences:</Paragraph>
                <View style={styles.preferencesChips}>
                  {customer.preferred_materials?.slice(0, 2).map((material, index) => (
                    <Chip key={index} compact style={styles.preferenceChip}>
                      {material}
                    </Chip>
                  ))}
                  {customer.preferred_colors?.slice(0, 2).map((color, index) => (
                    <Chip key={index} compact style={styles.preferenceChip}>
                      {color}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button 
                mode="outlined" 
                compact
                onPress={() => navigation.navigate('CustomerDetails', { customerId: customer.id })}
                style={styles.actionButton}
              >
                View Details
              </Button>
              <Button 
                mode="contained" 
                compact
                onPress={() => navigation.navigate('CreateOrder', { customerId: customer.id })}
                style={styles.actionButton}
              >
                New Order
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search customers, companies, or contact info..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.typeFilters}
        >
          {BUSINESS_TYPES.map(type => (
            <Chip
              key={type.key}
              mode={selectedBusinessType === type.key ? 'flat' : 'outlined'}
              selected={selectedBusinessType === type.key}
              onPress={() => setSelectedBusinessType(type.key)}
              style={styles.typeChip}
              textStyle={{ 
                color: selectedBusinessType === type.key ? 'white' : type.color 
              }}
              selectedColor={type.color}
              icon={type.icon}
            >
              {type.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Customers List */}
      <ScrollView
        style={styles.customersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <Card style={styles.loadingCard}>
            <Card.Content>
              <Paragraph>Loading customers...</Paragraph>
            </Card.Content>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Avatar.Icon size={64} icon="account-group" />
              <Title style={styles.emptyTitle}>No Customers Found</Title>
              <Paragraph style={styles.emptyDescription}>
                {searchQuery || selectedBusinessType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Add your first customer to get started'
                }
              </Paragraph>
              {!searchQuery && selectedBusinessType === 'all' && (
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('CreateCustomer')}
                  style={styles.createCustomerButton}
                >
                  Add First Customer
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          filteredCustomers.map(renderCustomerCard)
        )}
      </ScrollView>

      {/* Summary Footer */}
      {!loading && filteredCustomers.length > 0 && (
        <View style={styles.summaryFooter}>
          <Paragraph style={styles.summaryText}>
            Showing {filteredCustomers.length} of {customers.length} customers
          </Paragraph>
        </View>
      )}

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="account-plus"
        onPress={() => navigation.navigate('CreateCustomer')}
        label="Add Customer"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 2,
  },
  typeFilters: {
    flexDirection: 'row',
  },
  typeChip: {
    marginRight: 8,
  },
  customersList: {
    flex: 1,
    padding: 16,
  },
  customerCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  customerHeader: {
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameAndCompany: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  badges: {
    alignItems: 'flex-end',
  },
  customerDetails: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactItem: {
    flex: 0.48,
    paddingVertical: 4,
  },
  fullWidthContact: {
    paddingVertical: 4,
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactDescription: {
    fontSize: 10,
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
  },
  lastOrderContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginVertical: 4,
  },
  lastOrderText: {
    fontSize: 12,
    color: '#2196f3',
  },
  preferencesContainer: {
    marginTop: 8,
  },
  preferencesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  preferencesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  preferenceChip: {
    height: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  loadingCard: {
    elevation: 2,
  },
  emptyCard: {
    elevation: 2,
    marginTop: 50,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  createCustomerButton: {
    paddingHorizontal: 24,
  },
  summaryFooter: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2C5530',
  },
});