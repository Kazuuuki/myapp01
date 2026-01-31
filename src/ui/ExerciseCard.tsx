import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const lastSet = item.lastSet;
  const lastText = lastSet
    ? `${toDisplayWeight(lastSet.weight, unit)}${unit} x ${lastSet.reps}`
    : 'No previous set';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => onPress(item.exercise.id)} style={styles.headerText}>
          <Text style={styles.title}>{item.exercise.name}</Text>
          <Text style={styles.subtitle}>Previous: {lastText}</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={() => onDelete(item.exercise.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <View style={styles.sets}>
        {item.sets.map((set, index) => (
          <SetChip key={set.id} index={index} set={set} unit={unit} onUpdate={onUpdateSet} />
        ))}
      </View>
      <Pressable style={styles.addButton} onPress={() => onAddSet(item.exercise.id)}>
        <Text style={styles.addButtonText}>+ Add set</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
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
    color: '#666',
  },
  deleteButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f2b5b5',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#b42318',
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
    backgroundColor: '#111',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
