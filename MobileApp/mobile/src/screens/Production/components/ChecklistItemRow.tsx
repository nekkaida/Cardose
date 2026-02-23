import React, { memo, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Checkbox,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { theme } from '../../../theme/theme';
import type { ChecklistItem } from '../types';
import { isCustomItem } from './qualityControlHelpers';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onUpdateName: (itemId: string, name: string) => void;
  onRemove: (itemId: string) => void;
}

export const ChecklistItemRow = memo<ChecklistItemRowProps>(
  function ChecklistItemRow({ item, onToggle, onUpdateNotes, onUpdateName, onRemove }) {
    const isCustom = isCustomItem(item.id);
    const [notesVisible, setNotesVisible] = useState(!!item.notes);

    const showNotes = notesVisible || !!item.notes;

    const handleToggle = useCallback(() => onToggle(item.id), [onToggle, item.id]);

    const handleNotesChange = useCallback(
      (text: string) => onUpdateNotes(item.id, text),
      [onUpdateNotes, item.id]
    );

    const handleNameChange = useCallback(
      (text: string) => onUpdateName(item.id, text),
      [onUpdateName, item.id]
    );

    const handleRemove = useCallback(() => {
      Alert.alert(
        'Remove Item',
        `Remove "${item.name || 'this item'}" from the checklist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemove(item.id),
          },
        ]
      );
    }, [onRemove, item.id, item.name]);

    const handleShowNotes = useCallback(() => setNotesVisible(true), []);

    return (
      <View style={styles.checklistItem}>
        <View style={styles.checklistRow}>
          <Checkbox
            status={item.checked ? 'checked' : 'unchecked'}
            onPress={handleToggle}
            color={theme.colors.primary}
            accessibilityLabel={`${item.name || 'Custom item'}: ${item.checked ? 'checked' : 'unchecked'}`}
          />
          {isCustom ? (
            <TextInput
              value={item.name}
              onChangeText={handleNameChange}
              style={styles.customItemInput}
              placeholder="Enter check item name..."
              autoFocus={!item.name}
              dense
            />
          ) : (
            <Text
              style={[
                styles.checklistLabel,
                item.checked && styles.checklistLabelChecked,
              ]}
            >
              {item.name}
            </Text>
          )}
          {!showNotes && (
            <IconButton
              icon="note-plus-outline"
              size={18}
              iconColor={theme.colors.textSecondary}
              onPress={handleShowNotes}
              accessibilityLabel="Add note"
            />
          )}
          {isCustom && (
            <IconButton
              icon="delete-outline"
              size={20}
              iconColor={theme.colors.error}
              onPress={handleRemove}
              accessibilityLabel={`Remove ${item.name || 'custom item'}`}
            />
          )}
        </View>
        {showNotes && (
          <TextInput
            label={item.checked ? 'Notes (optional)' : 'Notes / reason (optional)'}
            value={item.notes || ''}
            onChangeText={handleNotesChange}
            mode="outlined"
            style={styles.itemNotesInput}
            multiline
            numberOfLines={2}
            dense
            autoFocus={notesVisible && !item.notes}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  checklistItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  checklistLabelChecked: {
    color: theme.colors.success,
  },
  customItemInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'transparent',
  },
  itemNotesInput: {
    marginLeft: 48,
    marginTop: 6,
    fontSize: 13,
  },
});
