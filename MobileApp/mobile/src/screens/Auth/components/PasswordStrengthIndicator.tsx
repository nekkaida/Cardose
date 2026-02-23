import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme/theme';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

function getStrengthLevel(passed: number): { label: string; color: string } {
  if (passed === 0) return { label: '', color: theme.colors.disabled };
  if (passed <= 1) return { label: 'Weak', color: theme.colors.error };
  if (passed <= 2) return { label: 'Fair', color: theme.colors.warning };
  if (passed <= 3) return { label: 'Good', color: theme.colors.warning };
  return { label: 'Strong', color: theme.colors.success };
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  if (!password) return null;

  const results = RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const passedCount = results.filter((r) => r.passed).length;
  const strength = getStrengthLevel(passedCount);

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Password strength: ${strength.label}, ${passedCount} of ${RULES.length} requirements met`}
      accessibilityRole="progressbar"
    >
      {/* Strength bar */}
      <View style={styles.barContainer}>
        {RULES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.barSegment,
              { backgroundColor: i < passedCount ? strength.color : theme.colors.divider },
            ]}
          />
        ))}
      </View>

      {strength.label ? (
        <Text style={[styles.strengthLabel, { color: strength.color }]}>
          {strength.label}
        </Text>
      ) : null}

      {/* Rule checklist */}
      <View style={styles.rules}>
        {results.map((rule, i) => (
          <Text
            key={i}
            style={[styles.rule, rule.passed ? styles.rulePassed : styles.ruleFailed]}
          >
            {rule.passed ? '\u2713' : '\u2022'} {rule.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  barContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  barSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rules: {
    gap: 2,
  },
  rule: {
    fontSize: 11,
  },
  rulePassed: {
    color: theme.colors.success,
  },
  ruleFailed: {
    color: theme.colors.textSecondary,
  },
});
