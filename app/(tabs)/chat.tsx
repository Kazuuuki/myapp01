import { useMemo, useRef, useState } from 'react';
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

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AI_CHAT_ENDPOINT, buildAiChatRequest } from '@/constants/ai-config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  status?: 'sending' | 'sent' | 'failed';
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: makeId(),
      role: 'bot',
      text: 'Hi! Share your training goal or attach a form photo for feedback.',
    },
  ]);
  const listRef = useRef<FlatList<Message>>(null);

  const handleAttach = () => {
    Alert.alert('Images coming soon', 'Image upload is not available yet. Please send text for now.');
  };

  const sendDisabled = useMemo(() => {
    return input.trim().length === 0;
  }, [input]);

  const markMessageStatus = (id: string, status: Message['status']) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, status } : message)),
    );
  };

  const sendToApi = async (id: string, text: string) => {
    try {
      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAiChatRequest(text)),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = (await response.json()) as { text?: string };
      const reply = data.text?.trim();
      if (!reply) {
        throw new Error('Empty response');
      }
      markMessageStatus(id, 'sent');
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'bot',
          text: reply,
        },
      ]);
    } catch (error) {
      markMessageStatus(id, 'failed');
    }
  };

  const handleSend = () => {
    if (sendDisabled) {
      return;
    }
    const text = input.trim();
    if (!text) {
      return;
    }
    const nextMessage: Message = {
      id: makeId(),
      role: 'user',
      text,
      status: 'sending',
    };
    setMessages((prev) => [...prev, nextMessage]);
    setInput('');
    sendToApi(nextMessage.id, text);
  };

  const handleRetry = (id: string) => {
    const message = messages.find((item) => item.id === id);
    if (!message) {
      return;
    }
    markMessageStatus(id, 'sending');
    sendToApi(id, message.text);
  };

  const renderMessage = ({ item }: { item: Message }) => {
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
          <Text style={[styles.title, { color: colors.text }]}>Chat Coach</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Ask about training or attach a form photo.</Text>
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
            <IconSymbol name="paperplane.fill" size={18} color={sendDisabled ? colors.mutedText : colors.primaryText} />
          </Pressable>
        </View>
        <Text style={[styles.helperText, { color: colors.mutedText }]}>
          Image uploads are not available yet. Text chat only for now.
        </Text>
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
    gap: 4,
  },
  title: {
    fontSize: 26,
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
