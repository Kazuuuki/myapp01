import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

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
      marked[key] = { marked: true, dotColor: '#111' };
    }
    marked[selectedDate] = {
      ...(marked[selectedDate] ?? {}),
      selected: true,
      selectedColor: '#111',
    };
    return marked;
  }, [summaries, selectedDate]);

  const selectedSummary = summaries[selectedDate];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>History</Text>

        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
            }}
            onMonthChange={(day) => loadMonth(day.year, day.month)}
            markedDates={markedDates}
            theme={{
              todayTextColor: '#111',
              arrowColor: '#111',
              monthTextColor: '#111',
              textDayFontWeight: '600',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>

        {loading ? <ActivityIndicator /> : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{selectedDate}</Text>
          {selectedSummary ? (
            <Text style={styles.summaryMeta}>
              Exercises: {selectedSummary.exerciseCount} ・ Sets: {selectedSummary.setCount}
            </Text>
          ) : (
            <Text style={styles.summaryMeta}>No session yet.</Text>
          )}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>トレーニング内容</Text>
          {detailLoading ? (
            <ActivityIndicator />
          ) : detail ? (
            detail.items.length === 0 ? (
              <Text style={styles.empty}>トレーニング履歴がありません。</Text>
            ) : (
              detail.items.map((item) => (
                <View key={item.exercise.id} style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{item.exercise.name}</Text>
                  {item.sets.length === 0 ? (
                    <Text style={styles.detailText}>セット記録がありません。</Text>
                  ) : (
                    item.sets.map((set, index) => (
                      <Text key={set.id} style={styles.detailText}>
                        Set {index + 1}: {toDisplayWeight(set.weight, unit)}
                        {unit} × {set.reps}
                      </Text>
                    ))
                  )}
                </View>
              ))
            )
          ) : (
            <Text style={styles.empty}>トレーニング履歴がありません。</Text>
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
    fontSize: 28,
    fontWeight: '700',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryMeta: {
    fontSize: 12,
    color: '#666',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    gap: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailSection: {
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    padding: 12,
    gap: 6,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 12,
    color: '#444',
  },
  empty: {
    color: '#666',
  },
});
