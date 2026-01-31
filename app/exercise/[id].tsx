import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ExerciseSummary } from '@/src/models/types';
import { toDisplayWeight } from '@/src/models/units';
import { useUnitPreference } from '@/src/state/unitPreference';
import { getExerciseSummary } from '@/src/usecases/exerciseDetail';
import { updateExerciseMemo } from '@/src/repo/exerciseRepo';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { unit } = useUnitPreference();
  const [summary, setSummary] = useState<ExerciseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }
    let mounted = true;
    getExerciseSummary(String(id)).then((data) => {
      if (mounted) {
        setSummary(data);
        setMemo(data?.exercise.memo ?? '');
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleMemoChange = async (text: string) => {
    setMemo(text);
    if (id) {
      await updateExerciseMemo(String(id), text.length ? text : null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.error}>Exercise not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{summary.exercise.name}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memo</Text>
          <TextInput
            value={memo}
            onChangeText={handleMemoChange}
            style={styles.memoInput}
            placeholder="Add notes"
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <Text style={styles.statText}>Best Volume: {summary.bestVolume ?? '--'}</Text>
          <Text style={styles.statText}>
            Max Weight: {summary.maxWeight ? `${toDisplayWeight(summary.maxWeight, unit)} ${unit}` : '--'}
          </Text>
          <Text style={styles.statText}>Max Reps: {summary.maxReps ?? '--'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sets</Text>
          {summary.recent.length === 0 ? (
            <Text style={styles.empty}>No history yet.</Text>
          ) : (
            summary.recent.map((item) => (
              <View key={item.set.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{item.sessionDate}</Text>
                <Text style={styles.historyValue}>
                  {toDisplayWeight(item.set.weight, unit)} {unit} x {item.set.reps}
                </Text>
              </View>
            ))
          )}
        </View>
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
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  memoInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
  },
  statText: {
    fontSize: 14,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    color: '#666',
  },
  error: {
    marginTop: 40,
    textAlign: 'center',
    color: '#d64545',
  },
});
