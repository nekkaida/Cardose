import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  FAB,
  List,
  Avatar,
  Divider,
  SegmentedButtons
} from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { FinancialService } from '../../services/FinancialService';
import { FinancialSummary, FinancialTransaction, RevenueAnalytics } from '../../types/Financial';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';

const screenWidth = Dimensions.get('window').width;

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' }
];

const CHART_CONFIG = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(44, 85, 48, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#2C5530'
  }
};

export default function FinancialScreen() {
  const navigation = useNavigation();
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Load financial data in parallel
      const [summary, transactions, analytics] = await Promise.all([
        FinancialService.getFinancialSummary(selectedPeriod as any),
        FinancialService.getRecentTransactions(20),
        FinancialService.getRevenueAnalytics(selectedPeriod as any)
      ]);
      
      setFinancialSummary(summary);
      setRecentTransactions(transactions);
      setRevenueAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  const renderFinancialSummaryCards = () => {
    if (!financialSummary) return null;

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.revenueCard]}>
            <Card.Content>
              <View style={styles.summaryCardContent}>
                <Avatar.Icon 
                  size={40} 
                  icon="trending-up" 
                  style={{ backgroundColor: '#4caf50' }}
                />
                <View style={styles.summaryText}>
                  <Title style={styles.summaryAmount}>
                    {formatCurrency(financialSummary.revenue.total)}
                  </Title>
                  <Paragraph style={styles.summaryLabel}>Total Revenue</Paragraph>
                  {financialSummary.revenue.growth_percentage !== 0 && (
                    <Chip 
                      compact 
                      style={{ backgroundColor: financialSummary.revenue.growth_percentage > 0 ? '#e8f5e8' : '#ffebee' }}
                      textStyle={{ 
                        color: financialSummary.revenue.growth_percentage > 0 ? '#4caf50' : '#f44336',
                        fontSize: 10
                      }}
                    >
                      {financialSummary.revenue.growth_percentage > 0 ? '↗' : '↘'} 
                      {formatPercentage(Math.abs(financialSummary.revenue.growth_percentage))}
                    </Chip>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.expenseCard]}>
            <Card.Content>
              <View style={styles.summaryCardContent}>
                <Avatar.Icon 
                  size={40} 
                  icon="trending-down" 
                  style={{ backgroundColor: '#ff5722' }}
                />
                <View style={styles.summaryText}>
                  <Title style={styles.summaryAmount}>
                    {formatCurrency(financialSummary.expenses.total)}
                  </Title>
                  <Paragraph style={styles.summaryLabel}>Total Expenses</Paragraph>
                  <Paragraph style={styles.summarySubtext}>
                    {formatPercentage((financialSummary.expenses.total / financialSummary.revenue.total) * 100)} of revenue
                  </Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.profitCard]}>
            <Card.Content>
              <View style={styles.summaryCardContent}>
                <Avatar.Icon 
                  size={40} 
                  icon="currency-usd" 
                  style={{ backgroundColor: '#2196f3' }}
                />
                <View style={styles.summaryText}>
                  <Title style={[
                    styles.summaryAmount,
                    { color: financialSummary.profit.net > 0 ? '#4caf50' : '#f44336' }
                  ]}>
                    {formatCurrency(financialSummary.profit.net)}
                  </Title>
                  <Paragraph style={styles.summaryLabel}>Net Profit</Paragraph>
                  <Paragraph style={styles.summarySubtext}>
                    Margin: {formatPercentage(financialSummary.profit.margin)}
                  </Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.ordersCard]}>
            <Card.Content>
              <View style={styles.summaryCardContent}>
                <Avatar.Icon 
                  size={40} 
                  icon="package-variant" 
                  style={{ backgroundColor: '#9c27b0' }}
                />
                <View style={styles.summaryText}>
                  <Title style={styles.summaryAmount}>
                    {financialSummary.orders.completed}
                  </Title>
                  <Paragraph style={styles.summaryLabel}>Orders Completed</Paragraph>
                  <Paragraph style={styles.summarySubtext}>
                    AOV: {formatCurrency(financialSummary.orders.average_value)}
                  </Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  };

  const renderRevenueChart = () => {
    if (!revenueAnalytics || !revenueAnalytics.monthly_trend.length) return null;

    const chartData = {
      labels: revenueAnalytics.monthly_trend.map(item => item.month.substring(5)), // Show MM format
      datasets: [{
        data: revenueAnalytics.monthly_trend.map(item => item.revenue),
        color: (opacity = 1) => `rgba(44, 85, 48, ${opacity})`,
        strokeWidth: 3
      }]
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Revenue Trend</Title>
          <LineChart
            data={chartData}
            width={screenWidth - 64}
            height={200}
            chartConfig={CHART_CONFIG}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderExpenseBreakdown = () => {
    if (!financialSummary) return null;

    const expenseData = [
      {
        name: 'Materials',
        value: financialSummary.expense_breakdown.materials,
        color: '#ff9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Labor',
        value: financialSummary.expense_breakdown.labor,
        color: '#2196f3',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Overhead',
        value: financialSummary.expense_breakdown.overhead,
        color: '#9c27b0',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Other',
        value: financialSummary.expense_breakdown.other,
        color: '#607d8b',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }
    ].filter(item => item.value > 0);

    if (expenseData.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Expense Breakdown</Title>
          <PieChart
            data={expenseData}
            width={screenWidth - 64}
            height={200}
            chartConfig={CHART_CONFIG}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
    );
  };

  const renderRecentTransactions = () => {
    if (recentTransactions.length === 0) {
      return (
        <Card style={styles.transactionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Transactions</Title>
            <Paragraph style={styles.emptyText}>No recent transactions found</Paragraph>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.transactionsCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Recent Transactions</Title>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('AllTransactions')}
            >
              View All
            </Button>
          </View>
          
          {recentTransactions.slice(0, 5).map((transaction, index) => (
            <View key={transaction.id}>
              <List.Item
                title={transaction.description}
                description={`${transaction.category} • ${formatDate(transaction.created_at)}`}
                left={() => (
                  <Avatar.Icon 
                    size={32} 
                    icon={transaction.type === 'income' ? 'arrow-down-bold' : 'arrow-up-bold'}
                    style={{ 
                      backgroundColor: transaction.type === 'income' ? '#4caf50' : '#f44336' 
                    }}
                  />
                )}
                right={() => (
                  <View style={styles.transactionAmount}>
                    <Title style={[
                      styles.transactionAmountText,
                      { color: transaction.type === 'income' ? '#4caf50' : '#f44336' }
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </Title>
                  </View>
                )}
                onPress={() => navigation.navigate('TransactionDetails', { transactionId: transaction.id })}
              />
              {index < recentTransactions.slice(0, 5).length - 1 && <Divider />}
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Card style={styles.actionsCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddTransaction')}
            icon="plus"
          >
            Add Transaction
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('GenerateInvoice')}
            icon="file-document"
          >
            Generate Invoice
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('FinancialReports')}
            icon="chart-line"
          >
            Reports
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PricingCalculator')}
            icon="calculator"
          >
            Pricing Calculator
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={setSelectedPeriod}
          buttons={PERIOD_OPTIONS}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <Card style={styles.loadingCard}>
            <Card.Content>
              <Paragraph>Loading financial data...</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          <>
            {renderFinancialSummaryCards()}
            {renderRevenueChart()}
            {renderExpenseBreakdown()}
            {renderRecentTransactions()}
            {renderQuickActions()}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddTransaction')}
        label="Add Transaction"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  periodSelector: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  segmentedButtons: {
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryCard: {
    flex: 0.48,
    elevation: 4,
    borderRadius: 12,
  },
  revenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff5722',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  ordersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#9c27b0',
  },
  summaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    flex: 1,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 10,
    color: '#888',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  transactionsCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  transactionAmount: {
    justifyContent: 'center',
  },
  transactionAmountText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  loadingCard: {
    elevation: 2,
    marginTop: 50,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2C5530',
  },
});