import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  SegmentedButtons,
  Avatar,
  Divider
} from 'react-native-paper';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { AnalyticsService } from '../../services/AnalyticsService';
import { BusinessAnalytics, PeriodType } from '../../types/Analytics';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';

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

export default function AnalyticsScreen() {
  const navigation = useNavigation();
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsData = await AnalyticsService.getBusinessAnalytics(selectedPeriod);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const renderKPICards = () => {
    if (!analytics) return null;

    const kpis = [
      {
        title: 'Total Revenue',
        value: formatCurrency(analytics.financial.revenue.total),
        change: analytics.financial.revenue.growth_percentage,
        icon: 'trending-up',
        color: '#4caf50'
      },
      {
        title: 'Orders Completed',
        value: analytics.orders.completed.toString(),
        change: analytics.orders.growth_percentage,
        icon: 'package-variant',
        color: '#2196f3'
      },
      {
        title: 'New Customers',
        value: analytics.customers.new_customers.toString(),
        change: analytics.customers.growth_percentage,
        icon: 'account-plus',
        color: '#9c27b0'
      },
      {
        title: 'Profit Margin',
        value: formatPercentage(analytics.financial.profit.margin),
        change: analytics.financial.profit.margin_change,
        icon: 'chart-line',
        color: '#ff9800'
      }
    ];

    return (
      <View style={styles.kpiContainer}>
        {kpis.map((kpi, index) => (
          <Card key={index} style={[styles.kpiCard, { borderLeftColor: kpi.color, borderLeftWidth: 4 }]}>
            <Card.Content>
              <View style={styles.kpiContent}>
                <Avatar.Icon 
                  size={40} 
                  icon={kpi.icon} 
                  style={{ backgroundColor: kpi.color }}
                />
                <View style={styles.kpiText}>
                  <Title style={styles.kpiValue}>{kpi.value}</Title>
                  <Paragraph style={styles.kpiTitle}>{kpi.title}</Paragraph>
                  {kpi.change !== 0 && (
                    <Chip 
                      compact 
                      style={{ 
                        backgroundColor: kpi.change > 0 ? '#e8f5e8' : '#ffebee',
                        marginTop: 4 
                      }}
                      textStyle={{ 
                        color: kpi.change > 0 ? '#4caf50' : '#f44336',
                        fontSize: 10
                      }}
                    >
                      {kpi.change > 0 ? '↗' : '↘'} {formatPercentage(Math.abs(kpi.change))}
                    </Chip>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };

  const renderRevenueChart = () => {
    if (!analytics || !analytics.financial.revenue_trend.length) return null;

    const chartData = {
      labels: analytics.financial.revenue_trend.map(item => 
        new Date(item.period).toLocaleDateString('id-ID', { month: 'short' })
      ),
      datasets: [{
        data: analytics.financial.revenue_trend.map(item => item.revenue),
        color: (opacity = 1) => `rgba(44, 85, 48, ${opacity})`,
        strokeWidth: 3
      }]
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Title style={styles.chartTitle}>Revenue Trend</Title>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('FinancialReports')}
            >
              Details
            </Button>
          </View>
          <LineChart
            data={chartData}
            width={screenWidth - 64}
            height={220}
            chartConfig={CHART_CONFIG}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderOrderStatusChart = () => {
    if (!analytics) return null;

    const statusData = [
      {
        name: 'Pending',
        population: analytics.orders.by_status.pending || 0,
        color: '#ff9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Production',
        population: (analytics.orders.by_status.production || 0) + 
                   (analytics.orders.by_status.approved || 0) + 
                   (analytics.orders.by_status.designing || 0),
        color: '#2196f3',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'QC',
        population: analytics.orders.by_status.quality_control || 0,
        color: '#9c27b0',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Completed',
        population: analytics.orders.by_status.completed || 0,
        color: '#4caf50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }
    ].filter(item => item.population > 0);

    if (statusData.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Title style={styles.chartTitle}>Order Status Distribution</Title>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('OrderReports')}
            >
              Details
            </Button>
          </View>
          <PieChart
            data={statusData}
            width={screenWidth - 64}
            height={220}
            chartConfig={CHART_CONFIG}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>
    );
  };

  const renderCustomerMetrics = () => {
    if (!analytics) return null;

    const metrics = [
      {
        label: 'Total Customers',
        value: analytics.customers.total.toString(),
        icon: 'account-group',
        color: '#2196f3'
      },
      {
        label: 'Active Customers',
        value: analytics.customers.active.toString(),
        icon: 'account-check',
        color: '#4caf50'
      },
      {
        label: 'VIP Customers',
        value: analytics.customers.by_loyalty.vip.toString(),
        icon: 'crown',
        color: '#ff9800'
      },
      {
        label: 'Avg. Order Value',
        value: formatCurrency(analytics.orders.average_order_value),
        icon: 'currency-usd',
        color: '#9c27b0'
      }
    ];

    return (
      <Card style={styles.metricsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Customer Insights</Title>
          <View style={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <View key={index} style={styles.metricItem}>
                <Avatar.Icon 
                  size={32} 
                  icon={metric.icon} 
                  style={{ backgroundColor: metric.color }}
                />
                <View style={styles.metricText}>
                  <Title style={styles.metricValue}>{metric.value}</Title>
                  <Paragraph style={styles.metricLabel}>{metric.label}</Paragraph>
                </View>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderProductionMetrics = () => {
    if (!analytics) return null;

    const productionData = {
      labels: ['On Time', 'Delayed'],
      data: [
        analytics.production.on_time_delivery_rate / 100,
        1 - (analytics.production.on_time_delivery_rate / 100)
      ]
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Title style={styles.chartTitle}>Production Performance</Title>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('ProductionReports')}
            >
              Details
            </Button>
          </View>
          
          <View style={styles.productionMetrics}>
            <View style={styles.productionStat}>
              <Title style={styles.productionValue}>
                {formatPercentage(analytics.production.on_time_delivery_rate)}
              </Title>
              <Paragraph style={styles.productionLabel}>On-Time Delivery</Paragraph>
            </View>
            
            <View style={styles.productionStat}>
              <Title style={styles.productionValue}>
                {analytics.production.average_completion_time.toFixed(1)} days
              </Title>
              <Paragraph style={styles.productionLabel}>Avg. Completion</Paragraph>
            </View>
            
            <View style={styles.productionStat}>
              <Title style={styles.productionValue}>
                {formatPercentage(analytics.production.quality_score_average)}
              </Title>
              <Paragraph style={styles.productionLabel}>Quality Score</Paragraph>
            </View>
          </View>

          <ProgressChart
            data={productionData}
            width={screenWidth - 64}
            height={180}
            strokeWidth={16}
            radius={32}
            chartConfig={{
              ...CHART_CONFIG,
              color: (opacity = 1, index = 0) => {
                const colors = ['#4caf50', '#ff5722'];
                return colors[index] || `rgba(44, 85, 48, ${opacity})`;
              }
            }}
            hideLegend={false}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderInventoryAlerts = () => {
    if (!analytics) return null;

    return (
      <Card style={styles.alertsCard}>
        <Card.Content>
          <View style={styles.alertsHeader}>
            <Title style={styles.sectionTitle}>Inventory Alerts</Title>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('InventoryReports')}
            >
              View All
            </Button>
          </View>
          
          <View style={styles.alertsContent}>
            <View style={styles.alertItem}>
              <Avatar.Icon 
                size={32} 
                icon="alert-circle" 
                style={{ backgroundColor: '#ff5722' }}
              />
              <View style={styles.alertText}>
                <Title style={styles.alertValue}>
                  {analytics.inventory.low_stock_items}
                </Title>
                <Paragraph style={styles.alertLabel}>Low Stock Items</Paragraph>
              </View>
            </View>
            
            <View style={styles.alertItem}>
              <Avatar.Icon 
                size={32} 
                icon="package-variant-closed" 
                style={{ backgroundColor: '#f44336' }}
              />
              <View style={styles.alertText}>
                <Title style={styles.alertValue}>
                  {analytics.inventory.out_of_stock_items}
                </Title>
                <Paragraph style={styles.alertLabel}>Out of Stock</Paragraph>
              </View>
            </View>
            
            <View style={styles.alertItem}>
              <Avatar.Icon 
                size={32} 
                icon="chart-line" 
                style={{ backgroundColor: '#2196f3' }}
              />
              <View style={styles.alertText}>
                <Title style={styles.alertValue}>
                  {formatCurrency(analytics.inventory.total_value)}
                </Title>
                <Paragraph style={styles.alertLabel}>Total Value</Paragraph>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Card style={styles.actionsCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Quick Reports</Title>
        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('SalesReport')}
            icon="chart-bar"
          >
            Sales Report
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CustomerReport')}
            icon="account-group"
          >
            Customer Report
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('InventoryReport')}
            icon="package-variant"
          >
            Inventory Report
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => navigation.navigate('FinancialReport')}
            icon="currency-usd"
          >
            Financial Report
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
          onValueChange={(value) => setSelectedPeriod(value as PeriodType)}
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
              <Paragraph>Loading analytics...</Paragraph>
            </Card.Content>
          </Card>
        ) : (
          <>
            {renderKPICards()}
            {renderRevenueChart()}
            {renderOrderStatusChart()}
            {renderCustomerMetrics()}
            {renderProductionMetrics()}
            {renderInventoryAlerts()}
            {renderQuickActions()}
          </>
        )}
      </ScrollView>
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
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    marginBottom: 12,
    elevation: 4,
    borderRadius: 12,
  },
  kpiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiText: {
    flex: 1,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 2,
  },
  kpiTitle: {
    fontSize: 12,
    color: '#666',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
  },
  chart: {
    borderRadius: 16,
  },
  metricsCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5530',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  metricText: {
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5530',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
  },
  productionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  productionStat: {
    alignItems: 'center',
  },
  productionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5530',
  },
  productionLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  alertsCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 12,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  alertItem: {
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    alignItems: 'center',
  },
  alertValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5530',
  },
  alertLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
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
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  loadingCard: {
    elevation: 2,
    marginTop: 50,
  },
});