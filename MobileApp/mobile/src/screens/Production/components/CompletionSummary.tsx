import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../../../theme/theme';

interface CompletionSummaryProps {
  completionPercentage: number;
  suggestedStatus: string;
}

export const CompletionSummary: React.FC<CompletionSummaryProps> = ({
  completionPercentage,
  suggestedStatus,
}) => {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>
        Completion: {completionPercentage}%
      </Text>
      <Text style={styles.suggestedStatus}>
        Suggested Status: {suggestedStatus.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  suggestedStatus: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
