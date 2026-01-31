import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AI_CHAT_ENDPOINT, AiChatHistoryItem, buildAiChatRequest } from '@/constants/ai-config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatMessage, ChatThread } from '@/src/models/types';
import {
  DEFAULT_CHAT_TITLE,
  addThreadMessage,
  deleteChatThread,
  deriveThreadTitle,
  getChatThread,
  listChatMessages,
  touchChatThread,
  updateChatThreadTitle,
} from '@/src/usecases/chat';

type MessageView = ChatMessage & {
  status?: 'sending' | 'sent' | 'failed';
};

function buildHistory(messages: MessageView[], limit = 10, excludeId?: string): AiChatHistoryItem[] {
  const filtered = messages
    .filter((message) => message.status !== 'failed' && message.id !== excludeId)
    .map((message) => ({ role: message.role, text: message.text }));
  if (filtered.length <= limit) {
    return filtered;
  }
  return filtered.slice(filtered.length - limit);
}

export default function ChatThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [input, setInput] = useState('');
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<MessageView>>(null);

  const loadThread = useCallback(async () => {
    if (!threadId) {
      return;
    }
    setLoading(true);
    const [threadData, messageData] = await Promise.all([
      getChatThread(String(threadId)),
      listChatMessages(String(threadId)),
    ]);
    setThread(threadData);
    setMessages(messageData);
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleAttach = () => {
    Alert.alert('Images coming soon', 'Image upload is not available yet. Please send text for now.');
  };

  const handleDeleteThread = () => {
    if (!threadId) {
      return;
    }
    Alert.alert('Delete chat?', 'This will remove the entire conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChatThread(String(threadId));
          router.replace('/chat');
        },
      },
    ]);
  };

  const sendDisabled = useMemo(() => {
    return input.trim().length === 0;
  }, [input]);

  const markMessageStatus = (id: string, status: MessageView['status']) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, status } : message)),
    );
  };

  const sendToApi = async (id: string, text: string, history: AiChatHistoryItem[]) => {
    if (!threadId) {
      markMessageStatus(id, 'failed');
      return;
    }
    try {
      const payload = buildAiChatRequest(text, history);
      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Request failed: ${response.status} ${errorBody}`);
      }
      const raw = await response.text();
      const data = raw ? (JSON.parse(raw) as { text?: string }) : {};
      const reply = data.text?.trim();
      if (!reply) {
        throw new Error('Empty response');
      }
      const now = new Date().toISOString();
      const botMessage = await addThreadMessage(String(threadId), 'bot', reply, now);
      await touchChatThread(String(threadId), now);
      markMessageStatus(id, 'sent');
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.warn('AI chat request failed', error);
      markMessageStatus(id, 'failed');
    }
  };

  const handleSend = async () => {
    if (sendDisabled || !threadId) {
      return;
    }
    const text = input.trim();
    if (!text) {
      return;
    }
    const history = buildHistory(messages, 10);
    const now = new Date().toISOString();
    const userMessage = await addThreadMessage(String(threadId), 'user', text, now);
    await touchChatThread(String(threadId), now);

    setMessages((prev) => [...prev, { ...userMessage, status: 'sending' }]);
    setInput('');

    if (thread && thread.title === DEFAULT_CHAT_TITLE) {
      const nextTitle = deriveThreadTitle(text);
      await updateChatThreadTitle(String(threadId), nextTitle, now);
      setThread((prev) => (prev ? { ...prev, title: nextTitle, updatedAt: now } : prev));
    }

    sendToApi(userMessage.id, text, history);
  };

  const handleRetry = (id: string) => {
    const message = messages.find((item) => item.id === id);
    if (!message) {
      return;
    }
    markMessageStatus(id, 'sending');
    const history = buildHistory(messages, 10, id);
    sendToApi(id, message.text, history);
  };

  const renderMessage = ({ item }: { item: MessageView }) => {
    const isUser = item.role === 'user';
    const bubbleStyle = isUser
      ? [styles.bubble, styles.bubbleUser, { backgroundColor: colors.primary }]
      : [styles.bubble, styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }];
    const textColor = isUser ? colors.primaryText : colors.text;

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
        {!isUser ? (
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}> 
            <Text style={[styles.avatarText, { color: colors.text }]}>AI</Text>
          </View>
        ) : null}
        <View style={styles.messageBody}>
          <View style={bubbleStyle}>
            <Text style={[styles.messageText, { color: textColor }]}>{item.text}</Text>
          </View>
          {item.status === 'sending' ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.mutedText} />
              <Text style={[styles.statusText, { color: colors.mutedText }]}>Sending...</Text>
            </View>
          ) : item.status === 'failed' ? (
            <Pressable onPress={() => handleRetry(item.id)}>
              <Text style={[styles.statusText, { color: colors.dangerText }]}>Failed. Tap to retry.</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}> 
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.text }]}>{'<'}</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {thread?.title ?? 'Chat'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>Ask about training or attach a form photo.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleDeleteThread}
            style={[styles.deleteThreadButton, { borderColor: colors.border }]}>
            <Text style={[styles.deleteThreadText, { color: colors.dangerText }]}>Delete</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.mutedText }]}>No messages yet.</Text>
              </View>
            )
          }
        />

        <View style={[styles.composer, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Pressable style={styles.iconButton} onPress={handleAttach}>
            <IconSymbol name="paperclip" size={22} color={colors.text} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, { color: colors.text }]}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={sendDisabled}
            style={[
              styles.sendButton,
              { backgroundColor: sendDisabled ? colors.secondary : colors.primary },
            ]}>
            <IconSymbol
              name="paperplane.fill"
              size={18}
              color={sendDisabled ? colors.mutedText : colors.primaryText}
            />
          </Pressable>
        </View>
        <Text style={[styles.helperText, { color: colors.mutedText }]}>Image uploads are not available yet. Text chat only for now.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
  },
  deleteThreadButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteThreadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 16,
  },
  emptyState: {
    paddingTop: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  messageBody: {
    maxWidth: '78%',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  bubbleUser: {
    borderTopRightRadius: 4,
  },
  bubbleBot: {
    borderWidth: 1,
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },
  statusText: {
    fontSize: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  iconButton: {
    padding: 6,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    fontSize: 15,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12,
  },
});
