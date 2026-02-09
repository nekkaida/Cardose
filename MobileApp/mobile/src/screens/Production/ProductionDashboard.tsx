import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  ProgressBar,
  Chip,
  FAB,
  Avatar,
  Divider,
  Button,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';

interface ProductionOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  current_stage: string;
  completion_percentage: number;
  estimated_completion: string;
  priority: string;
  created_at: string;
}

interface ProductionStats {
  active_orders: number;
  completed_today: number;
  pending_approval: number;
  quality_issues: number;
  stage_distribution: {
    designing: number;
    production: number;
    quality_control: number;
    completed: number;
  };
}

export const ProductionDashboard: React.FC = ({ navigation }: any) => {
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    fetchProductionData();
  }, []);

  const fetchProductionData = async () => {
    try {
      setLoading(true);

      // In a real implementation, these would be separate API calls
      const statsResponse = await authenticatedFetch('/production/stats');
      const ordersResponse = await authenticatedFetch('/production/active-orders');

      const statsData = await statsResponse.json();
      const ordersData = await ordersResponse.json();

      if (statsResponse.ok) {
        setStats(statsData.stats);
      }

      if (ordersResponse.ok) {
        setActiveOrders(ordersData.orders || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch production data');
      console.error('Fetch production data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProductionData();
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return '#F44336';
      case 'high':
        return '#FF9800';
      case 'normal':
        return '#4CAF50';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStageColor = (stage: string): string => {
    switch (stage) {
      case 'designing':
        return '#2196F3';
      case 'production':
        return '#FF9800';
      case 'quality_control':
        return '#9C27B0';
      case 'completed':
        return '#4CAF50';
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statContent}>
                <Avatar.Icon
                  size={40}
                  icon="package-variant"
                  style={{ backgroundColor: '#2196F3' }}
                />
                <View style={styles.statText}>
                  <Text style={styles.statValue}>{stats.active_orders}</Text>
                  <Text style={styles.statLabel}>Active Orders</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statContent}>
                <Avatar.Icon
                  size={40}
                  icon="check-circle"
                  style={{ backgroundColor: '#4CAF50' }}
                />
                <View style={styles.statText}>
                  <Text style={styles.statValue}>{stats.completed_today}</Text>
                  <Text style={styles.statLabel}>Completed Today</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statContent}>
                <Avatar.Icon
                  size={40}
                  icon="clock-outline"
                  style={{ backgroundColor: '#FF9800' }}
                />
                <View style={styles.statText}>
                  <Text style={styles.statValue}>{stats.pending_approval}</Text>
                  <Text style={styles.statLabel}>Pending Approval</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <View style={styles.statContent}>
                <Avatar.Icon
                  size={40}
                  icon="alert-circle"
                  style={{ backgroundColor: '#F44336' }}
                />
                <View style={styles.statText}>
                  <Text style={styles.statValue}>{stats.quality_issues}</Text>
                  <Text style={styles.statLabel}>Quality Issues</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  };

  const renderStageDistribution = () => {
    if (!stats) return null;

    const total = Object.values(stats.stage_distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
      <Card style={styles.card}>
        <Card.Title title="Production Stage Distribution" />
        <Card.Content>
          <View style={styles.stageItem}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageName}>Designing</Text>
              <Text style={styles.stageCount}>{stats.stage_distribution.designing}</Text>
            </View>
            <ProgressBar
              progress={stats.stage_distribution.designing / total}
              color="#2196F3"
              style={styles.progressBar}
            />
          </View>

          <View style={styles.stageItem}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageName}>Production</Text>
              <Text style={styles.stageCount}>{stats.stage_distribution.production}</Text>
            </View>
            <ProgressBar
              progress={stats.stage_distribution.production / total}
              color="#FF9800"
              style={styles.progressBar}
            />
          </View>

          <View style={styles.stageItem}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageName}>Quality Control</Text>
              <Text style={styles.stageCount}>
                {stats.stage_distribution.quality_control}
              </Text>
            </View>
            <ProgressBar
              progress={stats.stage_distribution.quality_control / total}
              color="#9C27B0"
              style={styles.progressBar}
            />
          </View>

          <View style={styles.stageItem}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageName}>Completed</Text>
              <Text style={styles.stageCount}>{stats.stage_distribution.completed}</Text>
            </View>
            <ProgressBar
              progress={stats.stage_distribution.completed / total}
              color="#4CAF50"
              style={styles.progressBar}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderActiveOrders = () => {
    if (activeOrders.length === 0) {
      return (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>No active production orders</Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.card}>
        <Card.Title
          title="Active Production Orders"
          right={(props) => (
            <Button mode="text" onPress={() => navigation.navigate('ProductionOrders')}>
              View All
            </Button>
          )}
        />
        <Card.Content>
          {activeOrders.slice(0, 5).map((order, index) => (
            <View key={order.id}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ProductionDetail', { orderId: order.id })
                }
              >
                <View style={styles.orderItem}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.order_number}</Text>
                    <Chip
                      style={{ backgroundColor: getPriorityColor(order.priority) }}
                      textStyle={styles.chipText}
                    >
                      {order.priority.toUpperCase()}
                    </Chip>
                  </View>

                  <Text style={styles.customerName}>{order.customer_name}</Text>

                  <View style={styles.stageChip}>
                    <Chip
                      style={{ backgroundColor: getStageColor(order.current_stage) }}
                      textStyle={styles.chipText}
                    >
                      {order.current_stage.replace('_', ' ').toUpperCase()}
                    </Chip>
                  </View>

                  <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>
                      {order.completion_percentage}% Complete
                    </Text>
                    <ProgressBar
                      progress={order.completion_percentage / 100}
                      color={theme.colors.primary}
                      style={styles.progressBar}
                    />
                  </View>

                  <Text style={styles.estimatedDate}>
                    Est. Completion: {formatDate(order.estimated_completion)}
                  </Text>
                </View>
              </TouchableOpacity>
              {index < activeOrders.slice(0, 5).length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Card style={styles.card}>
      <Card.Title title="Quick Actions" />
      <Card.Content>
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            style={styles.actionButton}
            onPress={() => navigation.navigate('TaskManagement')}
            icon="clipboard-list"
          >
            Task Management
          </Button>
          <Button
            mode="outlined"
            style={styles.actionButton}
            onPress={() => navigation.navigate('QualityControl')}
            icon="check-decagram"
          >
            Quality Control
          </Button>
          <Button
            mode="outlined"
            style={styles.actionButton}
            onPress={() => navigation.navigate('InventoryMaterials')}
            icon="package"
          >
            Materials
          </Button>
          <Button
            mode="outlined"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProductionReports')}
            icon="chart-bar"
          >
            Reports
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text>Loading production data...</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {renderStatsCards()}
            {renderStageDistribution()}
            {renderActiveOrders()}
            {renderQuickActions()}
          </>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateProductionOrder')}
        label="New Order"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 2,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  stageItem: {
    marginBottom: 16,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stageName: {
    fontSize: 14,
    color: theme.colors.text,
  },
  stageCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  orderItem: {
    paddingVertical: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  stageChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  estimatedDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  divider: {
    marginVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.textSecondary,
    paddingVertical: 20,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
