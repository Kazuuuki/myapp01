import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateLocal } from '@/src/models/dates';
import { SessionDateSummary, SessionDetail } from '@/src/models/types';
import { toDisplayWeight } from '@/src/models/units';
import { useUnitPreference } from '@/src/state/unitPreference';
import { getSessionByDateWithDetail, listSessionDatesInRange } from '@/src/usecases/history';

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: formatDateLocal(start),
    endDate: formatDateLocal(end),
  };
}

export default function HistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const today = formatDateLocal(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [summaries, setSummaries] = useState<Record<string, SessionDateSummary>>({});
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  const loadMonth = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getMonthRange(year, month);
      const items = await listSessionDatesInRange(startDate, endDate);
      const next: Record<string, SessionDateSummary> = {};
      for (const item of items) {
        next[item.date] = item;
      }
      setSummaries(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = new Date();
    loadMonth(current.getFullYear(), current.getMonth() + 1);
  }, [loadMonth]);

  useEffect(() => {
    let mounted = true;
    setDetailLoading(true);
    getSessionByDateWithDetail(selectedDate)
      .then((data) => {
        if (mounted) {
          setDetail(data);
        }
      })
      .finally(() => {
        if (mounted) {
          setDetailLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  const markedDates = useMemo(() => {
    const marked: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const key of Object.keys(summaries)) {
      marked[key] = { marked: true, dotColor: colors.primary };
    }
    marked[selectedDate] = {
      ...(marked[selectedDate] ?? {}),
      selected: true,
      selectedColor: colors.primary,
    };
    return marked;
  }, [summaries, selectedDate, colors.primary]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>

        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
            }}
            onMonthChange={(day) => loadMonth(day.year, day.month)}
            markedDates={markedDates}
            theme={{
              calendarBackground: colors.card,
              todayTextColor: colors.text,
              dayTextColor: colors.text,
              arrowColor: colors.text,
              monthTextColor: colors.text,
              textSectionTitleColor: colors.mutedText,
              textDayFontWeight: '600',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>

        {loading ? <ActivityIndicator /> : null}

        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>トレーニング内容</Text>
            <Pressable
              style={[styles.editButton, { borderColor: colors.primary }]}
              onPress={() => router.push(`/history/${selectedDate}/edit`)}>
              <Text style={[styles.editButtonText, { color: colors.text }]}>Edit</Text>
            </Pressable>
          </View>
          {detailLoading ? (
            <ActivityIndicator />
          ) : detail ? (
            detail.items.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedText }]}>トレーニング履歴がありません。</Text>
            ) : (
              detail.items.map((item) => (
                <View key={item.exercise.id} style={[styles.detailSection, { backgroundColor: colors.chip }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{item.exercise.name}</Text>
                  {item.sets.length === 0 ? (
                    <Text style={[styles.detailText, { color: colors.mutedText }]}>セット記録がありません。</Text>
                  ) : (
                    item.sets.map((set, index) => (
                      <Text key={set.id} style={[styles.detailText, { color: colors.subtleText }]}>
                        Set {index + 1}: {toDisplayWeight(set.weight, unit)}{unit} × {set.reps}
                      </Text>
                    ))
                  )}
                </View>
              ))
            )
          ) : (
            <Text style={[styles.empty, { color: colors.mutedText }]}>トレーニング履歴がありません。</Text>
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
    fontSize: 28,
    fontWeight: '700',
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButtonText: {
    fontWeight: '600',
  },
  detailSection: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 12,
  },
  empty: {
    fontSize: 12,
  },
});