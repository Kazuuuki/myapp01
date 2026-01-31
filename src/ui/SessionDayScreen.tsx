import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { BODY_PARTS } from '@/src/models/exercises';
import { useTodaySession } from '@/src/state/todaySession';
import { useUnitPreference } from '@/src/state/unitPreference';
import { ExerciseCard } from '@/src/ui/ExerciseCard';

type Props = {
  date: string;
  title: string;
  subtitle?: string;
};

export function SessionDayScreen({ date, title, subtitle }: Props) {
  const router = useRouter();
  const { unit } = useUnitPreference();
  const colorScheme = useColorScheme();
  const {
    exercises,
    loading,
    error,
    addExercise,
    addSet,
    updateSet,
    removeExercise,
    undo,
    undoAvailable,
  } = useTodaySession(date);

  const pickerTextColor = colorScheme === 'dark' ? '#f5f5f5' : '#111';
  const pickerBackground = colorScheme === 'dark' ? '#1c1c1e' : '#fafafa';
  const pickerBorder = colorScheme === 'dark' ? '#2c2c2e' : '#ddd';

  const [bodyPartKey, setBodyPartKey] = useState(BODY_PARTS[0]?.key ?? '');
  const selectedBodyPart = useMemo(
    () => BODY_PARTS.find((part) => part.key === bodyPartKey) ?? BODY_PARTS[0],
    [bodyPartKey],
  );
  const exerciseOptions = useMemo(() => selectedBodyPart?.exercises ?? [], [selectedBodyPart]);
  const [exerciseName, setExerciseName] = useState(exerciseOptions[0] ?? '');

  useEffect(() => {
    if (exerciseOptions.length > 0) {
      setExerciseName(exerciseOptions[0]);
    } else {
      setExerciseName('');
    }
  }, [bodyPartKey, exerciseOptions]);

  const handleAddExercise = async () => {
    if (!exerciseName) {
      return;
    }
    await addExercise(exerciseName, bodyPartKey || null);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert('Delete exercise?', 'Sets for this exercise in this session will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeExercise(exerciseId),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle ?? date}</Text>
          </View>
          {undoAvailable ? (
            <Pressable style={styles.undoButton} onPress={undo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Body Part</Text>
          <View style={[styles.pickerWrapper, { backgroundColor: pickerBackground, borderColor: pickerBorder }]}>
            <Picker
              selectedValue={bodyPartKey}
              onValueChange={(value) => setBodyPartKey(String(value))}
              style={{ color: pickerTextColor }}
              itemStyle={{ color: pickerTextColor }}>
              {BODY_PARTS.map((part) => (
                <Picker.Item key={part.key} label={part.label} value={part.key} color={pickerTextColor} />
              ))}
            </Picker>
          </View>

          <Text style={styles.inputLabel}>Exercise</Text>
          <View style={[styles.pickerWrapper, { backgroundColor: pickerBackground, borderColor: pickerBorder }]}>
            <Picker
              selectedValue={exerciseName}
              onValueChange={(value) => setExerciseName(String(value))}
              enabled={exerciseOptions.length > 0}
              style={{ color: pickerTextColor }}
              itemStyle={{ color: pickerTextColor }}>
              {exerciseOptions.map((name) => (
                <Picker.Item key={name} label={name} value={name} color={pickerTextColor} />
              ))}
            </Picker>
          </View>

          <Pressable
            style={[styles.addButton, !exerciseName && styles.addButtonDisabled]}
            onPress={handleAddExercise}
            disabled={!exerciseName}>
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {exercises.length === 0 && !loading ? (
          <Text style={styles.empty}>No exercises yet. Add one to start.</Text>
        ) : null}

        {exercises.map((item) => (
          <ExerciseCard
            key={item.exercise.id}
            item={item}
            unit={unit}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDelete={handleDeleteExercise}
            onPress={(exerciseId) => router.push(`/exercise/${exerciseId}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#999',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
  },
  undoText: {
    fontWeight: '600',
  },
  empty: {
    color: '#666',
  },
  error: {
    color: '#d64545',
  },
});
