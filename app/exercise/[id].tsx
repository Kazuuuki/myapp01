import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExerciseSummary } from '@/src/models/types';
import { toDisplayWeight } from '@/src/models/units';
import { updateExerciseImages } from '@/src/repo/exerciseRepo';
import { useUnitPreference } from '@/src/state/unitPreference';
import { getExerciseSummary } from '@/src/usecases/exerciseDetail';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit } = useUnitPreference();
  const [summary, setSummary] = useState<ExerciseSummary | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
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
          setImageUris(data?.exercise.images ?? []);
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

  const saveImages = async (next: string[]) => {
    if (!summary) {
      return;
    }
    try {
      await updateExerciseImages(summary.exercise.id, next);
      setImageUris(next);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              exercise: {
                ...prev.exercise,
                images: next,
              },
            }
          : prev,
      );
    } catch {
      Alert.alert('Failed to save images', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.backText, { color: colors.text }]}>{'<'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{summary.exercise.name}</Text>
        <Text style={[styles.bodyPart, { color: colors.mutedText }]}>Body part: {summary.exercise.bodyPart ?? '-'}</Text>

        <View style={[styles.imageSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.imageHeader}>
            <Text style={[styles.imageTitle, { color: colors.text }]}>Images</Text>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                  Alert.alert('Permission required', 'Allow photo library access to add images.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  selectionLimit: 0,
                  quality: 1,
                });
                if (result.canceled) {
                  return;
                }
                const nextUris = result.assets.map((asset) => asset.uri);
                const merged = Array.from(new Set([...imageUris, ...nextUris]));
                await saveImages(merged);
              }}
              style={[styles.imageAddButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.imageAddText, { color: colors.primaryText }]}>Add</Text>
            </Pressable>
          </View>
          {imageUris.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedText }]}>No images yet.</Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageList}>
                {imageUris.map((uri) => (
                  <Pressable
                    key={uri}
                    accessibilityRole="button"
                    onPress={() => setSelectedImageUri(uri)}
                    onLongPress={() =>
                      Alert.alert('Remove image?', 'This will remove the image from this exercise.', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            const next = imageUris.filter((item) => item !== uri);
                            await saveImages(next);
                          },
                        },
                      ])
                    }
                    style={[styles.imageItem, { borderColor: colors.border }]}
                  >
                    <Image source={{ uri }} style={styles.image} />
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[styles.imageHint, { color: colors.mutedText }]}>Tap to preview, long-press to remove.</Text>
            </>
          )}
        </View>

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

      <Modal visible={!!selectedImageUri} transparent animationType="fade" onRequestClose={() => setSelectedImageUri(null)}>
        <View style={[styles.previewOverlay, { backgroundColor: colors.background }]}>
          <Pressable style={styles.previewCloseArea} onPress={() => setSelectedImageUri(null)}>
            <Text style={[styles.previewCloseText, { color: colors.primaryText }]}>Close</Text>
          </Pressable>
          {selectedImageUri ? (
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  imageSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageAddButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  imageAddText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageList: {
    gap: 12,
    paddingVertical: 4,
  },
  imageItem: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: 140,
    height: 140,
  },
  imageHint: {
    fontSize: 11,
  },
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseArea: {
    position: 'absolute',
    top: 48,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  previewCloseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewImage: {
    width: '92%',
    height: '80%',
  },
});
