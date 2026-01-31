import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateLocal } from '@/src/models/dates';
import { SessionDetail } from '@/src/models/types';
import { toDisplayWeight } from '@/src/models/units';
import { useUnitPreference } from '@/src/state/unitPreference';
import { getSessionByDateWithDetail } from '@/src/usecases/history';

export default function HistoryDateScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const date = typeof rawDate === 'string' ? rawDate : formatDateLocal(new Date());
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSessionByDateWithDetail(date)
      .then((data) => {
        if (mounted) {
          setDetail(data);
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
  }, [date]);

  const items = useMemo(() => detail?.items ?? [], [detail]);

  if (!date) {
    return <Text>Invalid date.</Text>;
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}> 
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}> 
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>{date}</Text>
          <Text style={[styles.empty, { color: colors.mutedText }]}>トレーニング履歴がありません。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}> 
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>{date}</Text>

        {items.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedText }]}>トレーニング履歴がありません。</Text>
        ) : (
          items.map((item) => (
            <View key={item.exercise.id} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.exercise.name}</Text>
              {item.sets.length === 0 ? (
                <Text style={[styles.setText, { color: colors.mutedText }]}>セット記録がありません。</Text>
              ) : (
                item.sets.map((set, index) => (
                  <Text key={set.id} style={[styles.setText, { color: colors.subtleText }]}>
                    Set {index + 1}: {toDisplayWeight(set.weight, unit)}{unit} × {set.reps}
                  </Text>
                ))
              )}
            </View>
          ))
        )}
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
    fontSize: 26,
    fontWeight: '700',
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  setText: {
    fontSize: 12,
  },
  empty: {
    fontSize: 12,
  },
});