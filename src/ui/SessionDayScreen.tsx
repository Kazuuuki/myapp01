import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { BodyPart, Exercise } from '@/src/models/types';
import { useTodaySession } from '@/src/state/todaySession';
import { useUnitPreference } from '@/src/state/unitPreference';
import { ExerciseCard } from '@/src/ui/ExerciseCard';
import { ensureBodyPart, listBodyParts, listExercisesByBodyPart } from '@/src/usecases/exercises';

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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [exercisesByPart, setExercisesByPart] = useState<Exercise[]>([]);
  const [customBodyPart, setCustomBodyPart] = useState('');
  const [customExercise, setCustomExercise] = useState('');

  const pickerTextColor = colorScheme === 'dark' ? '#f5f5f5' : '#111';
  const pickerBackground = colorScheme === 'dark' ? '#1c1c1e' : '#fafafa';
  const pickerBorder = colorScheme === 'dark' ? '#2c2c2e' : '#ddd';

  const CUSTOM_BODY_PART = '__custom_body_part__';
  const CUSTOM_EXERCISE = '__custom_exercise__';

  const [bodyPartKey, setBodyPartKey] = useState('');
  const [exerciseKey, setExerciseKey] = useState('');

  const loadBodyParts = useCallback(async () => {
    const parts = await listBodyParts();
    setBodyParts(parts);
    const first = parts[0]?.name ?? CUSTOM_BODY_PART;
    setBodyPartKey((current) => current || first);
  }, []);

  const loadExercises = useCallback(async (bodyPartName: string) => {
    const items = await listExercisesByBodyPart(bodyPartName);
    setExercisesByPart(items);
    setExerciseKey(items[0]?.id ?? CUSTOM_EXERCISE);
  }, []);

  useEffect(() => {
    loadBodyParts().catch(() => undefined);
  }, [loadBodyParts]);

  useEffect(() => {
    if (!bodyPartKey) {
      return;
    }
    if (bodyPartKey === CUSTOM_BODY_PART) {
      setExercisesByPart([]);
      setExerciseKey(CUSTOM_EXERCISE);
      return;
    }
    loadExercises(bodyPartKey).catch(() => undefined);
  }, [bodyPartKey, loadExercises]);

  const handleAddExercise = async () => {
    const bodyPartName = bodyPartKey === CUSTOM_BODY_PART ? customBodyPart.trim() : bodyPartKey;
    if (!bodyPartName) {
      return;
    }

    if (bodyPartKey === CUSTOM_BODY_PART) {
      await ensureBodyPart(bodyPartName);
      await loadBodyParts();
      setBodyPartKey(bodyPartName);
    }

    let exerciseName = '';
    if (bodyPartKey === CUSTOM_BODY_PART || exerciseKey === CUSTOM_EXERCISE) {
      exerciseName = customExercise.trim();
    } else {
      exerciseName = exercisesByPart.find((exercise) => exercise.id === exerciseKey)?.name ?? '';
    }

    if (!exerciseName) {
      return;
    }

    await addExercise(exerciseName, bodyPartName || null);
    await loadExercises(bodyPartName);
    setCustomExercise('');
    setCustomBodyPart('');
    setIsAddOpen(false);
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

  const isAddDisabled =
    (bodyPartKey === CUSTOM_BODY_PART && !customBodyPart.trim()) ||
    (bodyPartKey === CUSTOM_BODY_PART && !customExercise.trim()) ||
    (bodyPartKey !== CUSTOM_BODY_PART &&
      exerciseKey === CUSTOM_EXERCISE &&
      !customExercise.trim());

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

        <Pressable style={styles.addTrigger} onPress={() => setIsAddOpen(true)}>
          <Text style={styles.addTriggerText}>Add Exercise</Text>
        </Pressable>

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

      <Modal transparent visible={isAddOpen} animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <Pressable style={styles.modalClose} onPress={() => setIsAddOpen(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Body Part</Text>
            <View style={[styles.pickerWrapper, { backgroundColor: pickerBackground, borderColor: pickerBorder }]}>
              <Picker
                selectedValue={bodyPartKey}
                onValueChange={(value) => setBodyPartKey(String(value))}
                style={[styles.picker, { color: pickerTextColor }]}
                itemStyle={[styles.pickerItem, { color: pickerTextColor }]}
                dropdownIconColor={pickerTextColor}>
                {bodyParts.map((part) => (
                  <Picker.Item key={part.id} label={part.name} value={part.name} color={pickerTextColor} />
                ))}
                <Picker.Item key="__custom__" label="＋ 新しい部位" value={CUSTOM_BODY_PART} color={pickerTextColor} />
              </Picker>
            </View>

            {bodyPartKey === CUSTOM_BODY_PART ? (
              <>
                <Text style={styles.inputLabel}>New Body Part</Text>
                <TextInput
                  value={customBodyPart}
                  onChangeText={setCustomBodyPart}
                  placeholder="部位名を入力"
                  style={[styles.textInput, { color: pickerTextColor, borderColor: pickerBorder }]}
                  placeholderTextColor={pickerTextColor}
                />
                <Text style={styles.inputLabel}>New Exercise</Text>
                <TextInput
                  value={customExercise}
                  onChangeText={setCustomExercise}
                  placeholder="種目名を入力"
                  style={[styles.textInput, { color: pickerTextColor, borderColor: pickerBorder }]}
                  placeholderTextColor={pickerTextColor}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Exercise</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: pickerBackground, borderColor: pickerBorder }]}>
                  <Picker
                    selectedValue={exerciseKey}
                    onValueChange={(value) => setExerciseKey(String(value))}
                    enabled={exercisesByPart.length > 0}
                    style={[styles.picker, { color: pickerTextColor }]}
                    itemStyle={[styles.pickerItem, { color: pickerTextColor }]}
                    dropdownIconColor={pickerTextColor}>
                    {exercisesByPart.map((exercise) => (
                      <Picker.Item key={exercise.id} label={exercise.name} value={exercise.id} color={pickerTextColor} />
                    ))}
                    <Picker.Item key="__custom__" label="＋ 新しい種目" value={CUSTOM_EXERCISE} color={pickerTextColor} />
                  </Picker>
                </View>
                {exerciseKey === CUSTOM_EXERCISE ? (
                  <>
                    <Text style={styles.inputLabel}>New Exercise</Text>
                    <TextInput
                      value={customExercise}
                      onChangeText={setCustomExercise}
                      placeholder="種目名を入力"
                      style={[styles.textInput, { color: pickerTextColor, borderColor: pickerBorder }]}
                      placeholderTextColor={pickerTextColor}
                    />
                  </>
                ) : null}
              </>
            )}

            <Pressable
              style={[styles.addButton, isAddDisabled && styles.addButtonDisabled]}
              onPress={handleAddExercise}
              disabled={isAddDisabled}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  addTrigger: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTriggerText: {
    color: '#fff',
    fontWeight: '600',
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
    height: 130,
  },
  picker: {
    height: 130,
  },
  pickerItem: {
    height: 130,
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalClose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
  },
  modalCloseText: {
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