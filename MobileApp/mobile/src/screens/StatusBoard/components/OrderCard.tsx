import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { Order } from '../types';
import { isOverdue, formatDate, formatCurrency, getPriorityConfig } from '../helpers';
import { theme } from '../../../theme/theme';

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onPhotos: (order: Order) => void;
  onQualityCheck: (order: Order) => void;
}

export default function OrderCard({
  order,
  onPress,
  onPhotos,
  onQualityCheck,
}: OrderCardProps) {
  const overdue =
    isOverdue(order.due_date) &&
    order.status !== 'completed' &&
    order.status !== 'cancelled';
  const priority = getPriorityConfig(order.priority);
  const showPriority = order.priority !== 'normal';

  return (
    <TouchableOpacity
      style={[styles.card, overdue && styles.overdueCard]}
      onPress={() => onPress(order)}
      accessibilityRole="button"
      accessibilityLabel={[
        `Pesanan ${order.order_number}`,
        order.customer_name,
        overdue ? 'terlambat' : '',
        showPriority ? `prioritas ${priority.label}` : '',
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Ketuk untuk mengubah status pesanan"
    >
      {/* Header: order number + badges */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        <View style={styles.badges}>
          {showPriority && (
            <View
              style={[styles.badge, { backgroundColor: priority.color + '20' }]}
            >
              <Text style={[styles.badgeText, { color: priority.color }]}>
                {priority.label.toUpperCase()}
              </Text>
            </View>
          )}
          {overdue && (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.errorLight },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: theme.colors.errorBorder }]}
              >
                TERLAMBAT
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Customer name */}
      <Text style={styles.customerName} numberOfLines={1}>
        {order.customer_name || '-'}
      </Text>

      {/* Meta row: box type + amount */}
      <View style={styles.metaRow}>
        <Text style={styles.boxType}>{order.box_type || 'Standard'}</Text>
        {order.total_amount > 0 && (
          <Text style={styles.amount}>{formatCurrency(order.total_amount)}</Text>
        )}
      </View>

      {/* Due date */}
      {order.due_date && (
        <Text style={[styles.dueDate, overdue && styles.dueDateOverdue]}>
          Tenggat: {formatDate(order.due_date)}
        </Text>
      )}

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onPhotos(order)}
          accessibilityRole="button"
          accessibilityLabel={`Lihat foto pesanan ${order.order_number}`}
        >
          <Icon source="camera" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.actionLabel}>Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onQualityCheck(order)}
          accessibilityRole="button"
          accessibilityLabel={`Quality check pesanan ${order.order_number}`}
        >
          <Icon
            source="check-circle-outline"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.actionLabel}>QC</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 0,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boxType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.backgroundVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  amount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dueDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  dueDateOverdue: {
    color: theme.colors.errorBorder,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.backgroundVariant,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
