import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatThreadSummary } from '@/src/models/types';
import { createChatThread, deleteChatThread, listChatThreads } from '@/src/usecases/chat';

function formatPreview(text: string | null): string {
  if (!text) {
    return 'No messages yet.';
  }
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString();
}

export default function ChatThreadsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(() => {
    setLoading(true);
    listChatThreads()
      .then(setThreads)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadThreads();
    }, [loadThreads]),
  );

  const handleCreate = async () => {
    const thread = await createChatThread();
    router.push(`/chat/${thread.id}`);
  };

  const handleDelete = (threadId: string) => {
    Alert.alert('Delete chat?', 'This will remove the entire conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChatThread(threadId);
          loadThreads();
        },
      },
    ]);
  };

  const emptyLabel = useMemo(() => {
    if (loading) {
      return 'Loading chats...';
    }
    return 'Start your first chat to get coaching tips.';
  }, [loading]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Chat</Text>
        <Pressable style={[styles.newButton, { backgroundColor: colors.primary }]} onPress={handleCreate}>
          <IconSymbol name="paperplane.fill" size={16} color={colors.primaryText} />
          <Text style={[styles.newButtonText, { color: colors.primaryText }]}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.threadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={styles.threadMain}>
              <View style={styles.threadHeader}>
                <Text style={[styles.threadTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.threadDate, { color: colors.mutedText }]}>
                  {formatDateLabel(item.lastMessageAt ?? item.updatedAt)}
                </Text>
              </View>
              <Text style={[styles.threadPreview, { color: colors.mutedText }]} numberOfLines={2}>
                {formatPreview(item.lastMessageText)}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.deleteButton, { borderColor: colors.border }]}
              onPress={() => handleDelete(item.id)}>
              <Text style={[styles.deleteButtonText, { color: colors.dangerText }]}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>{emptyLabel}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  newButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  threadCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  threadMain: {
    flex: 1,
    gap: 8,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  threadTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  threadDate: {
    fontSize: 12,
  },
  threadPreview: {
    fontSize: 12,
    lineHeight: 18,
  },
  deleteButton: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    paddingTop: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
