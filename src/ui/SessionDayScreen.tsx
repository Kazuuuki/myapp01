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
import {
  AiTodayMenu,
  TodayMenuRequestOptions,
  applyAiTodayMenuToSession,
  requestAiTodayMenu,
} from '@/src/usecases/aiTodayMenu';
import { ensureBodyPart, listBodyParts, listExercisesByBodyPart } from '@/src/usecases/exercises';
import { removeExerciseFromToday } from '@/src/usecases/today';
import { getUserProfile } from '@/src/usecases/userProfile';

type Props = {
  date: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

export function SessionDayScreen({ date, title, subtitle, showBack = false }: Props) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const {
    session,
    exercises,
    loading,
    error,
    addExercise,
    addSet,
    updateSet,
    removeSet,
    pastePreviousSets,
    removeExercise,
    refresh,
  } = useTodaySession(date);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [exercisesByPart, setExercisesByPart] = useState<Exercise[]>([]);
  const [newBodyPart, setNewBodyPart] = useState('');
  const [newExercise, setNewExercise] = useState('');

  const pickerTextColor = colorScheme === 'dark' ? colors.text : colors.text;
  const pickerBackground = colors.inputBackground;
  const pickerBorder = colors.inputBorder;

  const [bodyPartKey, setBodyPartKey] = useState('');
  const [exerciseKey, setExerciseKey] = useState('');
  const [aiBodyPartKey, setAiBodyPartKey] = useState('');
  const [aiTimeLimitKey, setAiTimeLimitKey] = useState<string>('45');
  const [aiGoal, setAiGoal] = useState('');
  const [aiApplyStrategy, setAiApplyStrategy] = useState<TodayMenuRequestOptions['applyStrategy']>('append');
  const [aiWeightStrategy, setAiWeightStrategy] = useState<'last' | 'ai_or_last'>('last');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMenu, setAiMenu] = useState<AiTodayMenu | null>(null);

  const loadBodyParts = useCallback(async () => {
    const parts = await listBodyParts();
    setBodyParts(parts);
    const first = parts[0]?.name ?? '';
    setBodyPartKey((current) => current || first);
    setAiBodyPartKey((current) => current || first);
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

  const aiTimeLimitMin = useCallback((): number | undefined => {
    const parsed = Number(aiTimeLimitKey);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [aiTimeLimitKey]);

  const confirmProceedWithoutProfile = useCallback(async (): Promise<boolean> => {
    const profile = await getUserProfile();
    if (profile) {
      return true;
    }
    return new Promise<'edit' | 'generate' | 'cancel'>((resolve) => {
      Alert.alert(
        'Profile not set',
        'AI提案はプロフィールがあると精度が上がります。プロフィールなしで生成しますか？',
        [
          { text: 'Edit profile', onPress: () => resolve('edit') },
          { text: 'Generate', onPress: () => resolve('generate') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
        ],
      );
    }).then((choice) => {
      if (choice === 'edit') {
        router.push('/profile');
        return false;
      }
      if (choice === 'generate') {
        return true;
      }
      return false;
    });
  }, [router]);

  const handleGenerateAiMenu = useCallback(async () => {
    if (!aiBodyPartKey) {
      return;
    }
    setAiError(null);
    setAiMenu(null);

    const ok = await confirmProceedWithoutProfile();
    if (!ok) {
      return;
    }

    setAiGenerating(true);
    try {
      const menu = await requestAiTodayMenu(date, {
        selectedBodyPart: aiBodyPartKey,
        timeLimitMin: aiTimeLimitMin(),
        todayGoal: aiGoal.trim() ? aiGoal.trim() : undefined,
        applyStrategy: aiApplyStrategy,
        includeWeightSuggestions: aiWeightStrategy !== 'last',
      });
      setAiMenu(menu);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to generate menu');
    } finally {
      setAiGenerating(false);
    }
  }, [aiApplyStrategy, aiBodyPartKey, aiGoal, aiTimeLimitMin, confirmProceedWithoutProfile, date]);

  const handleApplyAiMenu = useCallback(async () => {
    if (!session || !aiMenu) {
      return;
    }

    setAiError(null);

    if (aiApplyStrategy === 'replace' && exercises.length > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Replace today exercises?',
          'This will remove all exercises and sets for today before adding the AI menu.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
          ],
        );
      });
      if (!confirmed) {
        return;
      }
    }

    setAiGenerating(true);

    try {
      if (aiApplyStrategy === 'replace' && exercises.length > 0) {
        for (const item of exercises) {
          await removeExerciseFromToday(session.id, item.exercise.id);
        }
      }
      await applyAiTodayMenuToSession(session.id, aiMenu, { weightStrategy: aiWeightStrategy });
      Alert.alert('Added', 'AI menu was added to today.');
      setIsAiOpen(false);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to apply menu');
    } finally {
      setAiGenerating(false);
      try {
        await refresh();
      } catch {
        // ignore
      }
    }
  }, [aiApplyStrategy, aiMenu, aiWeightStrategy, exercises, refresh, session]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={[styles.backButton, { borderColor: colors.border }]}>
              <Text style={[styles.backText, { color: colors.text }]}>{'<'}</Text>
            </Pressable>
          ) : null}
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle ?? date}</Text>
          </View>
        </View>

        <Pressable style={[styles.addTrigger, { backgroundColor: colors.primary }]} onPress={() => setIsAddOpen(true)}>
          <Text style={[styles.addTriggerText, { color: colors.primaryText }]}>Add Exercise</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            setAiError(null);
            setAiMenu(null);
            setIsAiOpen(true);
          }}>
          <Text style={[styles.addTriggerText, { color: colors.text }]}>AI提案</Text>
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

      <Modal transparent visible={isAiOpen} animationType="slide" onRequestClose={() => setIsAiOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>AI提案</Text>
                <Pressable style={[styles.modalClose, { borderColor: colors.primary }]} onPress={() => setIsAiOpen(false)}>
                  <Text style={[styles.modalCloseText, { color: colors.text }]}>Close</Text>
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Body Part</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: pickerBackground, borderColor: pickerBorder }]}>
                <Picker
                  selectedValue={aiBodyPartKey}
                  onValueChange={(value) => setAiBodyPartKey(String(value))}
                  style={[styles.picker, { color: pickerTextColor }]}
                  itemStyle={[styles.pickerItem, { color: pickerTextColor }]}
                  dropdownIconColor={pickerTextColor}>
                  {bodyParts.map((part) => (
                    <Picker.Item key={part.id} label={part.name} value={part.name} color={pickerTextColor} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Time Limit</Text>
              <View style={styles.segmentRow}>
                {[
                  { label: '30 min', value: '30' },
                  { label: '45 min', value: '45' },
                  { label: '60 min', value: '60' },
                ].map((item) => {
                  const selected = aiTimeLimitKey === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      onPress={() => setAiTimeLimitKey(item.value)}
                      style={[
                        styles.segmentButton,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        selected && { borderColor: colors.primary, backgroundColor: colors.primary },
                      ]}>
                      <Text style={[styles.segmentButtonText, { color: selected ? colors.primaryText : colors.text }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Add Strategy</Text>
              <View style={styles.segmentRow}>
                {[
                  { label: 'Append', value: 'append' as const },
                  { label: 'Replace', value: 'replace' as const },
                ].map((item) => {
                  const selected = aiApplyStrategy === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      onPress={() => setAiApplyStrategy(item.value)}
                      style={[
                        styles.segmentButton,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        selected && { borderColor: colors.primary, backgroundColor: colors.primary },
                      ]}>
                      <Text style={[styles.segmentButtonText, { color: selected ? colors.primaryText : colors.text }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Weight</Text>
              <View style={styles.segmentRow}>
                {[
                  { label: 'Last', value: 'last' as const },
                  { label: 'AI', value: 'ai_or_last' as const },
                ].map((item) => {
                  const selected = aiWeightStrategy === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      onPress={() => setAiWeightStrategy(item.value)}
                      style={[
                        styles.segmentButton,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        selected && { borderColor: colors.primary, backgroundColor: colors.primary },
                      ]}>
                      <Text style={[styles.segmentButtonText, { color: selected ? colors.primaryText : colors.text }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedText }]}>Goal (optional)</Text>
              <TextInput
                value={aiGoal}
                onChangeText={setAiGoal}
                placeholder="例: 筋肥大 / 強度 / 軽め / フォーム"
                style={[styles.textInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholderTextColor={colors.mutedText}
              />

              {aiError ? <Text style={[styles.error, { color: colors.dangerText }]}>{aiError}</Text> : null}
              {aiGenerating ? <ActivityIndicator /> : null}

              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }, aiGenerating && { backgroundColor: colors.disabled }]}
                onPress={handleGenerateAiMenu}
                disabled={aiGenerating}>
                <Text style={[styles.addButtonText, { color: colors.primaryText }]}>Generate</Text>
              </Pressable>

              {aiMenu ? (
                <View style={[styles.aiPreviewCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {aiMenu.title ? <Text style={[styles.aiTitle, { color: colors.text }]}>{aiMenu.title}</Text> : null}

                  {aiMenu.warnings?.length ? (
                    <View style={styles.aiSection}>
                      {aiMenu.warnings.slice(0, 6).map((w, idx) => (
                        <Text key={`${idx}-${w}`} style={[styles.aiMuted, { color: colors.dangerText }]}>
                          • {w}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.aiSection}>
                    {aiMenu.items.map((it, idx) => (
                      <View key={`${idx}-${it.exerciseName}`} style={styles.aiItem}>
                        <Text style={[styles.aiItemTitle, { color: colors.text }]}>{it.exerciseName}</Text>
                        <Text style={[styles.aiMuted, { color: colors.mutedText }]}>
                          sets:{' '}
                          {it.sets
                            .map((s) => (s.weight === null ? `x${s.reps}` : `${s.weight}x${s.reps}`))
                            .join(', ')}
                        </Text>
                        {it.note ? <Text style={[styles.aiMuted, { color: colors.mutedText }]}>{it.note}</Text> : null}
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={[styles.addButton, { backgroundColor: colors.primary }, aiGenerating && { backgroundColor: colors.disabled }]}
                    onPress={handleApplyAiMenu}
                    disabled={aiGenerating}>
                    <Text style={[styles.addButtonText, { color: colors.primaryText }]}>Add to Today</Text>
                  </Pressable>
                </View>
              ) : null}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  backText: {
    fontSize: 20,
    fontWeight: '600',
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
  secondaryTrigger: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  aiPreviewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  aiSection: {
    gap: 6,
  },
  aiItem: {
    gap: 2,
  },
  aiItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiMuted: {
    fontSize: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
