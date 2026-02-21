import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order, StatusOption } from '../types';
import OrderCard from './OrderCard';
import { theme } from '../../../theme/theme';

interface StatusColumnProps {
  status: StatusOption;
  orders: Order[];
  onOrderPress: (order: Order) => void;
  onPhotos: (order: Order) => void;
  onQualityCheck: (order: Order) => void;
}

export default function StatusColumn({
  status,
  orders,
  onOrderPress,
  onPhotos,
  onQualityCheck,
}: StatusColumnProps) {
  if (orders.length === 0) return null;

  return (
    <View style={styles.statusGroup}>
      <View style={[styles.statusHeader, { backgroundColor: status.color + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusTitle, { color: status.color }]}>
          {status.label}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: status.color }]}>
          <Text style={styles.countText}>{orders.length}</Text>
        </View>
      </View>

      {orders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          onPress={onOrderPress}
          onPhotos={onPhotos}
          onQualityCheck={onQualityCheck}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statusGroup: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
});
