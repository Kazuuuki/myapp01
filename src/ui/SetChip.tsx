import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SetRecord, WeightUnit } from '@/src/models/types';
import { fromDisplayWeight, getWeightStep, toDisplayWeight } from '@/src/models/units';
import { NumberStepper } from '@/src/ui/NumberStepper';

type Props = {
  index: number;
  set: SetRecord;
  unit: WeightUnit;
  onUpdate: (setId: string, weight: number, reps: number, memo: string | null) => void;
  onDelete: (setId: string) => void;
};

export function SetChip({ index, set, unit, onUpdate, onDelete }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [weightDisplay, setWeightDisplay] = useState(toDisplayWeight(set.weight, unit));
  const [reps, setReps] = useState(set.reps);
  const [memoText, setMemoText] = useState(set.memo ?? '');
  const [showMemo, setShowMemo] = useState(Boolean(set.memo?.trim()));

  useEffect(() => {
    setWeightDisplay(toDisplayWeight(set.weight, unit));
    setReps(set.reps);
    setMemoText(set.memo ?? '');
    setShowMemo(Boolean(set.memo?.trim()));
  }, [set.weight, set.reps, set.memo, unit]);

  const handleWeightChange = (nextValue: number) => {
    setWeightDisplay(nextValue);
    const weightKg = fromDisplayWeight(nextValue, unit);
    onUpdate(set.id, weightKg, reps, memoText.trim() === '' ? null : memoText);
  };

  const handleRepsChange = (nextReps: number) => {
    const nextInt = Math.max(1, Math.round(nextReps));
    setReps(nextInt);
    const weightKg = fromDisplayWeight(weightDisplay, unit);
    onUpdate(set.id, weightKg, nextInt, memoText.trim() === '' ? null : memoText);
  };

  const handleMemoBlur = () => {
    const weightKg = fromDisplayWeight(weightDisplay, unit);
    const nextMemo = memoText.trim() === '' ? null : memoText;
    if (!nextMemo) {
      setShowMemo(false);
    }
    onUpdate(set.id, weightKg, reps, nextMemo);
  };

  const handleMenuPress = () => {
    const hasMemo = memoText.trim().length > 0;

    Alert.alert('オプション', undefined, [
      ...(!hasMemo
        ? [
            {
              text: 'メモを追加',
              onPress: () => setShowMemo(true),
            },
          ]
        : []),
      ...(hasMemo
        ? [
            {
              text: 'メモを削除',
              style: 'destructive',
              onPress: () => {
                const weightKg = fromDisplayWeight(weightDisplay, unit);
                setMemoText('');
                setShowMemo(false);
                onUpdate(set.id, weightKg, reps, null);
              },
            },
          ]
        : []),
      {
        text: 'セットを削除',
        style: 'destructive',
        onPress: () => onDelete(set.id),
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.chip }]}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.setLabel, { color: colors.subtleText }]}>Set {index + 1}</Text>
          <Pressable
            style={[
              styles.menuButton,
              { backgroundColor: colors.secondary },
            ]}
            onPress={handleMenuPress}>
            <Text style={[styles.menuButtonText, { color: colors.text }]}>⋮</Text>
          </Pressable>
        </View>
        <NumberStepper
          label={`Weight (${unit})`}
          value={weightDisplay}
          step={getWeightStep(unit)}
          min={0}
          onChange={handleWeightChange}
        />
        <NumberStepper label="Reps" value={reps} step={1} min={1} onChange={handleRepsChange} />
        {showMemo ? (
          <TextInput
            value={memoText}
            onChangeText={setMemoText}
            onEndEditing={handleMemoBlur}
            placeholder="Memo"
            placeholderTextColor={colors.mutedText}
            style={[
              styles.memoInput,
              { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuButton: {
    borderRadius: 999,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    marginRight: 1,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  memoInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
});
