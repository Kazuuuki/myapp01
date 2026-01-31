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
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteAll } from '@/src/repo/workoutRepo';
import { useThemePreference } from '@/src/state/themePreference';
import { useUnitPreference } from '@/src/state/unitPreference';
import { exportAllToJson, exportSetsToCsv } from '@/src/usecases/export';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { unit, setUnit } = useUnitPreference();
  const { preference, setPreference } = useThemePreference();
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
    Alert.alert('全データを削除しますか？', 'セッション、種目、チャット、プロフィールが削除されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteAll();
          Alert.alert('削除しました', 'データを削除しました。');
        },
      },
    ]);
  };

  const handleFeedback = () => {
    Alert.alert('フィードバック', 'フィードバック機能は準備中です。');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>設定</Text>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>単位</Text>
          <View style={[styles.segment, { borderColor: colors.inputBorder }]}>
            <Pressable
              style={[
                styles.segmentButton,
                { backgroundColor: colors.card },
                unit === 'kg' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setUnit('kg')}>
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.text },
                  unit === 'kg' && { color: colors.primaryText },
                ]}>
                kg
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                { backgroundColor: colors.card },
                unit === 'lb' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setUnit('lb')}>
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.text },
                  unit === 'lb' && { color: colors.primaryText },
                ]}>
                lb
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>エクスポート</Text>
          <Pressable
            style={[styles.actionButton, { borderColor: colors.inputBorder }]}
            onPress={handleExportJson}
            disabled={exporting}>
            <Text style={[styles.actionText, { color: colors.text }]}>{exporting ? '出力中…' : 'JSONを共有'}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { borderColor: colors.inputBorder }]}
            onPress={handleExportCsv}
            disabled={exporting}>
            <Text style={[styles.actionText, { color: colors.text }]}>{exporting ? '出力中…' : 'CSVを共有'}</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>表示</Text>
          <Text style={[styles.inputLabel, { color: colors.mutedText }]}>テーマ</Text>
          <View style={[styles.segment, { borderColor: colors.inputBorder }]}>
            <Pressable
              style={[
                styles.segmentButton,
                { backgroundColor: colors.card },
                preference === 'system' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setPreference('system')}>
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.text },
                  preference === 'system' && { color: colors.primaryText },
                ]}>
                自動
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                { backgroundColor: colors.card },
                preference === 'light' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setPreference('light')}>
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.text },
                  preference === 'light' && { color: colors.primaryText },
                ]}>
                ライト
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                { backgroundColor: colors.card },
                preference === 'dark' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setPreference('dark')}>
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.text },
                  preference === 'dark' && { color: colors.primaryText },
                ]}>
                ダーク
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>プロフィール</Text>
          <Pressable
            style={[styles.actionButton, { borderColor: colors.inputBorder }]}
            onPress={() => router.push('/profile')}>
            <Text style={[styles.actionText, { color: colors.text }]}>プロフィールを編集</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>情報</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>バージョン</Text>
            <Text style={[styles.rowValue, { color: colors.mutedText }]}>
              {version} ({buildNumber})
            </Text>
          </View>
          <Pressable style={[styles.actionButton, { borderColor: colors.inputBorder }]} onPress={handleFeedback}>
            <Text style={[styles.actionText, { color: colors.text }]}>フィードバックを送る</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtleText }]}>危険な操作</Text>
          <Pressable
            style={[
              styles.actionButton,
              { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBackground },
            ]}
            onPress={handleDeleteAll}>
            <Text style={[styles.actionText, { color: colors.dangerText }]}>全データを削除</Text>
          </Pressable>
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
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
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
  },
  rowValue: {
    fontSize: 12,
  },
});
