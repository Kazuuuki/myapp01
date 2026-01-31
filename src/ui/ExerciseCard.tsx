import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExerciseWithSets, WeightUnit } from '@/src/models/types';
import { toDisplayWeight } from '@/src/models/units';
import { SetChip } from '@/src/ui/SetChip';

type Props = {
  item: ExerciseWithSets;
  unit: WeightUnit;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (setId: string, weight: number, reps: number) => void;
  onDeleteSet: (setId: string) => void;
  onPastePrevious: (exerciseId: string) => Promise<boolean> | boolean;
  onPress: (exerciseId: string) => void;
  onDelete: (exerciseId: string) => void;
};

export function ExerciseCard({
  item,
  unit,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onPastePrevious,
  onPress,
  onDelete,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const lastSessionSets = item.lastSessionSets ?? [];
  const lastSessionLabel = item.lastSessionDate ? `Previous (${item.lastSessionDate})` : 'Previous';
  const canPastePrevious = lastSessionSets.length > 0;
  const hasCurrentSets = item.sets.length > 0;

  const handlePastePrevious = () => {
    if (!canPastePrevious) {
      return;
    }
    if (!hasCurrentSets) {
      onPastePrevious(item.exercise.id);
      return;
    }
    Alert.alert(
      'Replace current sets?',
      'Current sets will be replaced with the previous session.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => onPastePrevious(item.exercise.id) },
      ],
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => onPress(item.exercise.id)} style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{item.exercise.name}</Text>
            <Pressable
              style={[
                styles.pasteButton,
                { borderColor: colors.primary, backgroundColor: colors.surface },
                !canPastePrevious && { borderColor: colors.disabled },
              ]}
              disabled={!canPastePrevious}
              onPress={handlePastePrevious}>
              <Text style={[styles.pasteButtonText, { color: canPastePrevious ? colors.text : colors.mutedText }]}>
                Paste previous
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>{lastSessionLabel}</Text>
          {lastSessionSets.length === 0 ? (
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>No previous session</Text>
          ) : (
            lastSessionSets.map((set, index) => (
              <Text key={set.id} style={[styles.subtitle, { color: colors.mutedText }]}>
                Set {index + 1}: {toDisplayWeight(set.weight, unit)}{unit} x {set.reps}
              </Text>
            ))
          )}
        </Pressable>
        <Pressable
          style={[styles.deleteButton, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBackground }]}
          onPress={() => onDelete(item.exercise.id)}>
          <Text style={[styles.deleteText, { color: colors.dangerText }]}>Delete</Text>
        </Pressable>
      </View>
      <View style={styles.sets}>
        {item.sets.map((set, index) => (
          <SetChip key={set.id} index={index} set={set} unit={unit} onUpdate={onUpdateSet} onDelete={onDeleteSet} />
        ))}
      </View>
      <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => onAddSet(item.exercise.id)}>
        <Text style={[styles.addButtonText, { color: colors.primaryText }]}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  deleteButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteText: {
    fontWeight: '600',
    fontSize: 12,
  },
  sets: {
    gap: 8,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addButtonText: {
    fontWeight: '600',
  },
  pasteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  pasteButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
