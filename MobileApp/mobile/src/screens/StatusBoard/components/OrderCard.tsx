import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../types';
import { isOverdue } from '../helpers';
import { theme } from '../../../theme/theme';

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onPhotos: (order: Order) => void;
  onQualityCheck: (order: Order) => void;
}

export default function OrderCard({ order, onPress, onPhotos, onQualityCheck }: OrderCardProps) {
  const overdue = isOverdue(order.due_date) && order.status !== 'completed';

  return (
    <TouchableOpacity
      style={[styles.orderCard, overdue && styles.overdueCard]}
      onPress={() => onPress(order)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        {overdue && <Text style={styles.overdueBadge}>OVERDUE</Text>}
      </View>
      <Text style={styles.customerName} numberOfLines={1}>
        {order.customer_name}
      </Text>
      <View style={styles.orderMeta}>
        <Text style={styles.boxType}>{order.box_type || 'Standard'}</Text>
        {order.due_date && (
          <Text style={styles.dueDate}>
            Due: {new Date(order.due_date).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onPhotos(order)}
        >
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionLabel}>Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onQualityCheck(order)}
        >
          <Text style={styles.actionIcon}>✅</Text>
          <Text style={styles.actionLabel}>QC</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  overdueCard: {
    borderLeftColor: theme.colors.errorBorder,
    backgroundColor: theme.colors.errorLight,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  overdueBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.errorBorder,
    backgroundColor: theme.colors.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  boxType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dueDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.backgroundVariant,
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
    gap: 4,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
