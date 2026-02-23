import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { theme } from '../../../theme/theme';
import type { QCStatus } from '../types';
import { getStatusColor, getStatusLabel } from './qualityControlHelpers';

interface CompletionSummaryProps {
  completionPercentage: number;
  suggestedStatus: QCStatus;
  selectedStatus: QCStatus | null;
}

export const CompletionSummary = memo<CompletionSummaryProps>(
  function CompletionSummary({ completionPercentage, suggestedStatus, selectedStatus }) {
    const progress = completionPercentage / 100;
    const progressColor = getStatusColor(suggestedStatus);
    const overriddenStatus = selectedStatus !== null && selectedStatus !== suggestedStatus
      ? selectedStatus
      : null;

    return (
      <View style={styles.container}>
        <View style={styles.percentageRow}>
          <Text style={styles.percentageLabel}>Completion</Text>
          <Text style={[styles.percentageValue, { color: progressColor }]}>
            {completionPercentage}%
          </Text>
        </View>

        <ProgressBar
          progress={progress}
          color={progressColor}
          style={styles.progressBar}
        />

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Suggested:</Text>
          <View style={[styles.statusBadge, { backgroundColor: progressColor }]}>
            <Text style={styles.statusBadgeText}>
              {getStatusLabel(suggestedStatus)}
            </Text>
          </View>
        </View>

        {overriddenStatus && (
          <View style={styles.overrideWarning}>
            <Text style={styles.overrideWarningText}>
              You selected "{getStatusLabel(overriddenStatus)}" which differs from the
              suggested status. Make sure this is intentional.
            </Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentageLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  percentageValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  overrideWarning: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.warningLight,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  overrideWarningText: {
    fontSize: 12,
    color: theme.colors.warningText,
    lineHeight: 18,
  },
});
