import { useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionDetail } from '@/src/models/types';
import { useUnitPreference } from '@/src/state/unitPreference';
import { getSessionDetail } from '@/src/usecases/history';
import { deleteSet, updateSet } from '@/src/repo/setRepo';
import { SetChip } from '@/src/ui/SetChip';
import { deleteExerciseFromSession } from '@/src/repo/workoutRepo';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    if (!id) {
      return;
    }
    const data = await getSessionDetail(String(id));
    setDetail(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    loadDetail().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [id, loadDetail]);

  const handleUpdateSet = async (setId: string, weight: number, reps: number, memo: string | null) => {
    await updateSet(setId, weight, reps, memo);
    setDetail((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        items: current.items.map((item) => ({
          ...item,
          sets: item.sets.map((set) =>
            set.id === setId ? { ...set, weight, reps, memo } : set,
          ),
        })),
      };
    });
  };

  const handleDeleteSet = async (setId: string) => {
    await deleteSet(setId);
    setDetail((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => ({
          ...item,
          sets: item.sets.filter((set) => set.id !== setId),
        })),
      };
    });
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!detail) {
      return;
    }
    Alert.alert('Delete exercise?', 'Sets for this exercise in this session will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExerciseFromSession(detail.session.id, exerciseId);
          await loadDetail();
        },
      },
    ]);
  };

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
        <Text style={[styles.error, { color: colors.dangerText }]}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>{detail.session.date}</Text>

        {detail.items.map((item) => (
          <View key={item.exercise.id} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Pressable
                onPress={() => router.push(`/exercise/${item.exercise.id}`)}
                style={styles.sectionTitleWrapper}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.exercise.name}</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteButton, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBackground }]}
                onPress={() => handleDeleteExercise(item.exercise.id)}>
                <Text style={[styles.deleteText, { color: colors.dangerText }]}>Delete</Text>
              </Pressable>
            </View>
            {item.sets.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedText }]}>No sets</Text>
            ) : (
              item.sets.map((set, index) => (
                <SetChip
                  key={set.id}
                  index={index}
                  set={set}
                  unit={unit}
                  onUpdate={handleUpdateSet}
                  onDelete={handleDeleteSet}
                />
              ))
            )}
          </View>
        ))}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitleWrapper: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteText: {
    fontWeight: '600',
    fontSize: 12,
  },
  empty: {
    fontSize: 12,
  },
  error: {
    marginTop: 40,
    textAlign: 'center',
  },
});
