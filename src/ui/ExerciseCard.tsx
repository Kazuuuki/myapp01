import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  onPress: (exerciseId: string) => void;
  onDelete: (exerciseId: string) => void;
};

export function ExerciseCard({ item, unit, onAddSet, onUpdateSet, onPress, onDelete }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const lastSet = item.lastSet;
  const lastText = lastSet
    ? `${toDisplayWeight(lastSet.weight, unit)}${unit} x ${lastSet.reps}`
    : 'No previous set';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => onPress(item.exercise.id)} style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{item.exercise.name}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Previous: {lastText}</Text>
        </Pressable>
        <Pressable
          style={[styles.deleteButton, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBackground }]}
          onPress={() => onDelete(item.exercise.id)}>
          <Text style={[styles.deleteText, { color: colors.dangerText }]}>Delete</Text>
        </Pressable>
      </View>
      <View style={styles.sets}>
        {item.sets.map((set, index) => (
          <SetChip key={set.id} index={index} set={set} unit={unit} onUpdate={onUpdateSet} />
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
});