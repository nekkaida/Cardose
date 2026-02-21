import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Checkbox,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { theme } from '../../../theme/theme';
import { ChecklistItem, isCustomItem } from './qualityControlHelpers';

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onUpdateName: (itemId: string, name: string) => void;
  onRemove: (itemId: string) => void;
}

export const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  item,
  onToggle,
  onUpdateNotes,
  onUpdateName,
  onRemove,
}) => {
  const isCustom = isCustomItem(item.id);

  return (
    <View style={styles.checklistItem}>
      <View style={styles.checklistRow}>
        <Checkbox
          status={item.checked ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
        {isCustom ? (
          <TextInput
            value={item.name}
            onChangeText={(text) => onUpdateName(item.id, text)}
            style={styles.customItemInput}
            placeholder="Enter check item name"
          />
        ) : (
          <Text style={styles.checklistLabel}>{item.name}</Text>
        )}
        {isCustom && (
          <IconButton
            icon="delete"
            size={20}
            onPress={() => onRemove(item.id)}
          />
        )}
      </View>
      {item.checked && (
        <TextInput
          label="Notes (optional)"
          value={item.notes || ''}
          onChangeText={(text) => onUpdateNotes(item.id, text)}
          mode="outlined"
          style={styles.itemNotesInput}
          multiline
          numberOfLines={2}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  checklistItem: {
    marginBottom: 12,
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
  customItemInput: {
    flex: 1,
    height: 40,
  },
  itemNotesInput: {
    marginLeft: 48,
    marginTop: 8,
  },
});
