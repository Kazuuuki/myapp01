import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExerciseSummary } from '@/src/models/types';
import { toDisplayWeight } from '@/src/models/units';
import { useUnitPreference } from '@/src/state/unitPreference';
import { getExerciseSummary } from '@/src/usecases/exerciseDetail';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const [summary, setSummary] = useState<ExerciseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!id) {
      return;
    }
    getExerciseSummary(String(id))
      .then((data) => {
        if (mounted) {
          setSummary(data);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
        <Text style={[styles.error, { color: colors.dangerText }]}>Exercise not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>{summary.exercise.name}</Text>
        <Text style={[styles.bodyPart, { color: colors.mutedText }]}>Body part: {summary.exercise.bodyPart ?? '-'}</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Best Volume</Text>
          <Text style={[styles.cardValue, { color: colors.subtleText }]}>
            {summary.bestVolume ? `${summary.bestVolume.toFixed(1)} ${unit} x reps` : '-'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Max Weight</Text>
          <Text style={[styles.cardValue, { color: colors.subtleText }]}>
            {summary.maxWeight ? `${toDisplayWeight(summary.maxWeight, unit)} ${unit}` : '-'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Max Reps</Text>
          <Text style={[styles.cardValue, { color: colors.subtleText }]}> {summary.maxReps ?? '-'} </Text>
        </View>

        <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Sets</Text>
          {summary.recent.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedText }]}>No history yet.</Text>
          ) : (
            summary.recent.map((item) => (
              <View key={item.set.id} style={[styles.historyRow, { borderColor: colors.inputBorder }]}>
                <View>
                  <Text style={[styles.historyDate, { color: colors.subtleText }]}>{item.sessionDate}</Text>
                  <Text style={[styles.historyValue, { color: colors.text }]}>
                    {toDisplayWeight(item.set.weight, unit)}{unit} x {item.set.reps}
                  </Text>
                </View>
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
  },
  container: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  bodyPart: {
    fontSize: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyDate: {
    fontSize: 12,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    fontSize: 12,
  },
  error: {
    marginTop: 40,
    textAlign: 'center',
  },
});
