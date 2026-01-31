import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

import { Colors } from '@/constants/theme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const {
    exercises,
    loading,
    error,
    addExercise,
    addSet,
    updateSet,
    removeSet,
    pastePreviousSets,
    removeExercise,
  } = useTodaySession(date);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [exercisesByPart, setExercisesByPart] = useState<Exercise[]>([]);
  const [newBodyPart, setNewBodyPart] = useState('');
  const [newExercise, setNewExercise] = useState('');

  const pickerTextColor = colorScheme === 'dark' ? colors.text : colors.text;
  const pickerBackground = colors.inputBackground;
  const pickerBorder = colors.inputBorder;

  const [bodyPartKey, setBodyPartKey] = useState('');
  const [exerciseKey, setExerciseKey] = useState('');

  const loadBodyParts = useCallback(async () => {
    const parts = await listBodyParts();
    setBodyParts(parts);
    const first = parts[0]?.name ?? '';
    setBodyPartKey((current) => current || first);
  }, []);

  const loadExercises = useCallback(async (bodyPartName: string) => {
    const items = await listExercisesByBodyPart(bodyPartName);
    setExercisesByPart(items);
    setExerciseKey(items[0]?.id ?? '');
  }, []);

  useEffect(() => {
    loadBodyParts().catch(() => undefined);
  }, [loadBodyParts]);

  useEffect(() => {
    if (!bodyPartKey) {
      setExercisesByPart([]);
      setExerciseKey('');
      return;
    }
    loadExercises(bodyPartKey).catch(() => undefined);
  }, [bodyPartKey, loadExercises]);

  const handleAddExercise = async () => {
    const exerciseName = exercisesByPart.find((exercise) => exercise.id === exerciseKey)?.name ?? '';
    if (!exerciseName || !bodyPartKey) {
      return;
    }
    await addExercise(exerciseName, bodyPartKey);
    setIsAddOpen(false);
  };

  const handleCreateExercise = async () => {
    const bodyPartName = newBodyPart.trim();
    const exerciseName = newExercise.trim();
    if (!bodyPartName || !exerciseName) {
      return;
    }
    await ensureBodyPart(bodyPartName);
    await addExercise(exerciseName, bodyPartName);
    await loadBodyParts();
    setBodyPartKey(bodyPartName);
    await loadExercises(bodyPartName);
    setNewBodyPart('');
    setNewExercise('');
    setIsCreateOpen(false);
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

  const isAddDisabled = !exerciseKey;
  const isCreateDisabled = !newBodyPart.trim() || !newExercise.trim();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle ?? date}</Text>
          </View>
        </View>

        <Pressable style={[styles.addTrigger, { backgroundColor: colors.primary }]} onPress={() => setIsAddOpen(true)}>
          <Text style={[styles.addTriggerText, { color: colors.primaryText }]}>Add Exercise</Text>
        </Pressable>

        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text> : null}

        {exercises.length === 0 && !loading ? (
          <Text style={[styles.empty, { color: colors.mutedText }]}>No exercises yet. Add one to start.</Text>
        ) : null}

        {exercises.map((item) => (
          <ExerciseCard
            key={item.exercise.id}
            item={item}
            unit={unit}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDeleteSet={removeSet}
            onPastePrevious={pastePreviousSets}
            onDelete={handleDeleteExercise}
            onPress={(exerciseId) => router.push(`/exercise/${exerciseId}`)}
          />
        ))}
      </ScrollView>

      <Modal transparent visible={isAddOpen} animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
            <View style={styles.modalHeader}>
              <Pressable
                style={[styles.modalGhost, { borderColor: colors.primary }]}
                onPress={() => {
                  setIsAddOpen(false);
                  setIsCreateOpen(true);
                }}>
                <Text style={[styles.modalGhostText, { color: colors.text }]}>新規種目追加</Text>
              </Pressable>
              <Pressable style={[styles.modalClose, { borderColor: colors.primary }]} onPress={() => setIsAddOpen(false)}>
                <Text style={[styles.modalCloseText, { color: colors.text }]}>Close</Text>
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Body Part</Text>
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
              </Picker>
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Exercise</Text>
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
              </Picker>
            </View>

            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }, isAddDisabled && { backgroundColor: colors.disabled }]}
              onPress={handleAddExercise}
              disabled={isAddDisabled}>
              <Text style={[styles.addButtonText, { color: colors.primaryText }]}>Add</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isCreateOpen} animationType="slide" onRequestClose={() => setIsCreateOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>新規種目追加</Text>
                <Pressable style={[styles.modalClose, { borderColor: colors.primary }]} onPress={() => setIsCreateOpen(false)}>
                  <Text style={[styles.modalCloseText, { color: colors.text }]}>Close</Text>
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Body Part</Text>
              <TextInput
                value={newBodyPart}
                onChangeText={setNewBodyPart}
                placeholder="部位名を入力"
                style={[styles.textInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholderTextColor={colors.mutedText}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Exercise</Text>
              <TextInput
                value={newExercise}
                onChangeText={setNewExercise}
                placeholder="種目名を入力"
                style={[styles.textInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholderTextColor={colors.mutedText}
              />

              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }, isCreateDisabled && { backgroundColor: colors.disabled }]}
                onPress={handleCreateExercise}
                disabled={isCreateDisabled}>
                <Text style={[styles.addButtonText, { color: colors.primaryText }]}>Add</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  addTrigger: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTriggerText: {
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
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
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
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
  },
  modalCloseText: {
    fontWeight: '600',
  },
  modalGhost: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalGhostText: {
    fontWeight: '600',
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  empty: {
    fontSize: 12,
  },
  error: {
    fontSize: 12,
  },
});
