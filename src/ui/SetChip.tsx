import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SetRecord, WeightUnit } from '@/src/models/types';
import { fromDisplayWeight, getWeightStep, toDisplayWeight } from '@/src/models/units';
import { NumberStepper } from '@/src/ui/NumberStepper';

type Props = {
  index: number;
  set: SetRecord;
  unit: WeightUnit;
  onUpdate: (setId: string, weight: number, reps: number) => void;
};

export function SetChip({ index, set, unit, onUpdate }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [weightDisplay, setWeightDisplay] = useState(toDisplayWeight(set.weight, unit));
  const [reps, setReps] = useState(set.reps);

  useEffect(() => {
    setWeightDisplay(toDisplayWeight(set.weight, unit));
    setReps(set.reps);
  }, [set.weight, set.reps, unit]);

  const handleWeightChange = (nextValue: number) => {
    setWeightDisplay(nextValue);
    const weightKg = fromDisplayWeight(nextValue, unit);
    onUpdate(set.id, weightKg, reps);
  };

  const handleRepsChange = (nextReps: number) => {
    const nextInt = Math.max(1, Math.round(nextReps));
    setReps(nextInt);
    const weightKg = fromDisplayWeight(weightDisplay, unit);
    onUpdate(set.id, weightKg, nextInt);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.chip }]}> 
      <Text style={[styles.setLabel, { color: colors.subtleText }]}>Set {index + 1}</Text>
      <NumberStepper
        label={`Weight (${unit})`}
        value={weightDisplay}
        step={getWeightStep(unit)}
        min={0}
        onChange={handleWeightChange}
      />
      <NumberStepper label="Reps" value={reps} step={1} min={1} onChange={handleRepsChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  setLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});