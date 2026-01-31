import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProfileExperienceLevel, UserProfileSex } from '@/src/models/types';
import { getUserProfile, saveUserProfile } from '@/src/usecases/userProfile';

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseOptionalInt(label: string, value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} は数値で入力してください`);
  }
  const rounded = Math.round(parsed);
  if (rounded < 0) {
    throw new Error(`${label} は 0 以上で入力してください`);
  }
  return rounded;
}

function parseOptionalFloat(label: string, value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} は数値で入力してください`);
  }
  if (parsed < 0) {
    throw new Error(`${label} は 0 以上で入力してください`);
  }
  return parsed;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goal, setGoal] = useState('');
  const [equipment, setEquipment] = useState('');
  const [injuryOrPain, setInjuryOrPain] = useState('');

  const [frequencyPerWeek, setFrequencyPerWeek] = useState('');
  const [sessionDurationMin, setSessionDurationMin] = useState('');

  const [age, setAge] = useState('');
  const [sex, setSex] = useState<UserProfileSex | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<UserProfileExperienceLevel | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getUserProfile()
      .then((profile) => {
        if (!mounted) {
          return;
        }
        setGoal(profile?.goal ?? '');
        setEquipment(profile?.equipment ?? '');
        setInjuryOrPain(profile?.injuryOrPain ?? '');
        setFrequencyPerWeek(profile?.frequencyPerWeek?.toString() ?? '');
        setSessionDurationMin(profile?.sessionDurationMin?.toString() ?? '');
        setAge(profile?.age?.toString() ?? '');
        setSex(profile?.sex ?? null);
        setHeightCm(profile?.heightCm?.toString() ?? '');
        setWeightKg(profile?.weightKg?.toString() ?? '');
        setExperienceLevel(profile?.experienceLevel ?? null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const hasAnyValue = useMemo(() => {
    return [
      goal,
      equipment,
      injuryOrPain,
      frequencyPerWeek,
      sessionDurationMin,
      age,
      sex ?? '',
      heightCm,
      weightKg,
      experienceLevel ?? '',
    ].some((value) => String(value).trim().length > 0);
  }, [
    age,
    equipment,
    experienceLevel,
    frequencyPerWeek,
    goal,
    heightCm,
    injuryOrPain,
    sessionDurationMin,
    sex,
    weightKg,
  ]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        goal: normalizeText(goal),
        frequencyPerWeek: parseOptionalInt('頻度（週）', frequencyPerWeek),
        sessionDurationMin: parseOptionalInt('1回の時間（分）', sessionDurationMin),
        equipment: normalizeText(equipment),
        injuryOrPain: normalizeText(injuryOrPain),
        experienceLevel,
        age: parseOptionalInt('年齢', age),
        sex,
        heightCm: parseOptionalFloat('身長（cm）', heightCm),
        weightKg: parseOptionalFloat('体重（kg）', weightKg),
      };
      await saveUserProfile(payload);
      Alert.alert('保存しました', undefined, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setSaving(false);
    }
  }, [age, equipment, experienceLevel, frequencyPerWeek, goal, heightCm, injuryOrPain, router, sessionDurationMin, sex, weightKg]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={[styles.loadingText, { color: colors.mutedText }]}>読み込み中…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable style={[styles.backButton, { borderColor: colors.inputBorder }]} onPress={() => router.back()}>
              <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>プロフィール</Text>
              <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                端末内にのみ保存されます（送信時の付与はチャット画面で切替）
              </Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>目的・環境</Text>

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>目標（goal）</Text>
            <TextInput
              value={goal}
              onChangeText={setGoal}
              placeholder="例: 筋肥大 / 減量 / パフォーマンス向上"
              placeholderTextColor={colors.mutedText}
              style={[
                styles.textInput,
                { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
              ]}
            />

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>器具・環境（equipment）</Text>
            <TextInput
              value={equipment}
              onChangeText={setEquipment}
              placeholder="例: ジム（バーベル/ダンベル/マシン）"
              placeholderTextColor={colors.mutedText}
              style={[
                styles.textInput,
                { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
              ]}
            />

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>痛み・違和感（injury）</Text>
            <TextInput
              value={injuryOrPain}
              onChangeText={setInjuryOrPain}
              placeholder="例: 右肩に違和感（押し系で痛む）"
              placeholderTextColor={colors.mutedText}
              style={[
                styles.textArea,
                { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
              ]}
              multiline
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>頻度</Text>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>頻度（週）</Text>
                <TextInput
                  value={frequencyPerWeek}
                  onChangeText={setFrequencyPerWeek}
                  placeholder="例: 3"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
                  ]}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>1回の時間（分）</Text>
                <TextInput
                  value={sessionDurationMin}
                  onChangeText={setSessionDurationMin}
                  placeholder="例: 60"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>身体情報（任意）</Text>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>年齢</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="例: 30"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
                  ]}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>性別</Text>
                <View style={[styles.segment, { borderColor: colors.inputBorder }]}>
                  <Pressable
                    style={[
                      styles.segmentButton,
                      { backgroundColor: colors.card },
                      sex === 'male' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSex(sex === 'male' ? null : 'male')}>
                    <Text style={[styles.segmentText, { color: colors.text }, sex === 'male' && { color: colors.primaryText }]}>
                      男性
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentButton,
                      { backgroundColor: colors.card },
                      sex === 'female' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSex(sex === 'female' ? null : 'female')}>
                    <Text style={[styles.segmentText, { color: colors.text }, sex === 'female' && { color: colors.primaryText }]}>
                      女性
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentButton,
                      { backgroundColor: colors.card },
                      sex === 'other' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSex(sex === 'other' ? null : 'other')}>
                    <Text style={[styles.segmentText, { color: colors.text }, sex === 'other' && { color: colors.primaryText }]}>
                      その他
                    </Text>
                  </Pressable>
                </View>
                <Pressable style={styles.clearButton} onPress={() => setSex('prefer_not_to_say')}>
                  <Text style={[styles.clearButtonText, { color: colors.mutedText }]}>回答しない</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>身長（cm）</Text>
                <TextInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="例: 175"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
                  ]}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>体重（kg）</Text>
                <TextInput
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="例: 72"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
                  ]}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedText }]}>経験レベル</Text>
            <View style={[styles.segment, { borderColor: colors.inputBorder }]}>
              <Pressable
                style={[
                  styles.segmentButton,
                  { backgroundColor: colors.card },
                  experienceLevel === 'beginner' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setExperienceLevel(experienceLevel === 'beginner' ? null : 'beginner')}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: colors.text },
                    experienceLevel === 'beginner' && { color: colors.primaryText },
                  ]}>
                  初心者
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  { backgroundColor: colors.card },
                  experienceLevel === 'intermediate' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setExperienceLevel(experienceLevel === 'intermediate' ? null : 'intermediate')}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: colors.text },
                    experienceLevel === 'intermediate' && { color: colors.primaryText },
                  ]}>
                  中級
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  { backgroundColor: colors.card },
                  experienceLevel === 'advanced' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setExperienceLevel(experienceLevel === 'advanced' ? null : 'advanced')}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: colors.text },
                    experienceLevel === 'advanced' && { color: colors.primaryText },
                  ]}>
                  上級
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              saving && { backgroundColor: colors.disabled },
            ]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={[styles.saveButtonText, { color: colors.primaryText }]}>
              {saving ? '保存中…' : hasAnyValue ? '保存' : '空のまま保存'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  backText: {
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 84,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

