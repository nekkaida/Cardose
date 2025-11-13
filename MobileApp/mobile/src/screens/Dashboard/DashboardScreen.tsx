import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button, Surface } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  monthlyRevenue: number[];
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: [0, 0, 0, 0, 0, 0]
  });

  useEffect(() => {
    // Load dashboard data from local SQLite
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Implement SQLite data loading
    // Sample data for now
    setStats({
      totalOrders: 156,
      pendingOrders: 12,
      completedOrders: 144,
      totalRevenue: 45000000, // IDR
      monthlyRevenue: [5000000, 6500000, 8200000, 7100000, 9800000, 8500000]
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.totalOrders}</Title>
            <Paragraph>Total Orders</Paragraph>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.pendingOrders}</Title>
            <Paragraph>Pending</Paragraph>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>{stats.completedOrders}</Title>
            <Paragraph>Completed</Paragraph>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content>
            <Title style={styles.statNumber}>
              {formatCurrency(stats.totalRevenue)}
            </Title>
            <Paragraph>Total Revenue</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {/* Revenue Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title>Monthly Revenue Trend</Title>
          <LineChart
            data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [{
                data: stats.monthlyRevenue
              }]
            }}
            width={320}
            height={200}
            chartConfig={{
              backgroundColor: '#2C5530',
              backgroundGradientFrom: '#2C5530',
              backgroundGradientTo: '#4A7C59',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <View style={styles.actionButtons}>
            <Button mode="contained" style={styles.actionButton}>
              New Order
            </Button>
            <Button mode="outlined" style={styles.actionButton}>
              Add Customer
            </Button>
            <Button mode="outlined" style={styles.actionButton}>
              Update Inventory
            </Button>
            <Button mode="outlined" style={styles.actionButton}>
              Generate Report
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Activity */}
      <Card style={styles.activityCard}>
        <Card.Content>
          <Title>Recent Activity</Title>
          <Surface style={styles.activityItem}>
            <Paragraph>New order #PGB-2024-001 from PT. Berkah Jaya</Paragraph>
            <Paragraph style={styles.activityTime}>2 hours ago</Paragraph>
          </Surface>
          <Surface style={styles.activityItem}>
            <Paragraph>Order #PGB-2023-156 completed</Paragraph>
            <Paragraph style={styles.activityTime}>5 hours ago</Paragraph>
          </Surface>
          <Surface style={styles.activityItem}>
            <Paragraph>Low stock alert: Premium Cardboard</Paragraph>
            <Paragraph style={styles.activityTime}>1 day ago</Paragraph>
          </Surface>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 0.48,
    elevation: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C5530',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 4,
  },
  chart: {
    marginTop: 16,
    borderRadius: 16,
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  actionButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  activityCard: {
    marginBottom: 16,
    elevation: 4,
  },
  activityItem: {
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    elevation: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});