import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';

import { deleteAll } from '@/src/repo/workoutRepo';
import { useUnitPreference } from '@/src/state/unitPreference';
import { exportAllToJson, exportSetsToCsv } from '@/src/usecases/export';

export default function SettingsScreen() {
  const { unit, setUnit } = useUnitPreference();
  const [exporting, setExporting] = useState(false);
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '-';

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const payload = await exportAllToJson();
      await Share.share({ message: payload });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const payload = await exportSetsToCsv();
      await Share.share({ message: payload });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert('Delete all data?', 'This will remove all sessions and exercises.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAll();
          Alert.alert('Deleted', 'All data has been removed.');
        },
      },
    ]);
  };

  const handleFeedback = () => {
    Alert.alert('Feedback', 'Feedback form is coming soon.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit</Text>
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentButton, unit === 'kg' && styles.segmentActive]}
              onPress={() => setUnit('kg')}>
              <Text style={[styles.segmentText, unit === 'kg' && styles.segmentTextActive]}>kg</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentButton, unit === 'lb' && styles.segmentActive]}
              onPress={() => setUnit('lb')}>
              <Text style={[styles.segmentText, unit === 'lb' && styles.segmentTextActive]}>lb</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export</Text>
          <Pressable style={styles.actionButton} onPress={handleExportJson} disabled={exporting}>
            <Text style={styles.actionText}>Export JSON</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleExportCsv} disabled={exporting}>
            <Text style={styles.actionText}>Export CSV</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Theme</Text>
            <Text style={styles.rowValue}>Auto (System)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>
              {version} ({buildNumber})
            </Text>
          </View>
          <Pressable style={styles.actionButton} onPress={handleFeedback}>
            <Text style={styles.actionText}>Send Feedback</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleDeleteAll}>
            <Text style={[styles.actionText, styles.dangerText]}>Delete All Data</Text>
          </Pressable>
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
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentActive: {
    backgroundColor: '#111',
  },
  segmentText: {
    fontWeight: '600',
    color: '#111',
  },
  segmentTextActive: {
    color: '#fff',
  },
  actionButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionText: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontWeight: '600',
    color: '#333',
  },
  rowValue: {
    color: '#666',
  },
  dangerButton: {
    borderColor: '#f2b5b5',
    backgroundColor: '#fff5f5',
  },
  dangerText: {
    color: '#b42318',
  },
});
