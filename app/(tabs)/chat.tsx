import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Attachment = {
  id: string;
  kind: 'image';
  source: number;
  label: string;
};

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  status?: 'sending' | 'sent' | 'failed';
  attachments?: Attachment[];
};

const SAMPLE_IMAGE = require('@/assets/images/react-logo.png');

const BOT_REPLIES = [
  'Thanks for the details. For now, try keeping your chest up and slow down the eccentric.',
  'I can help with form feedback. If you attach a photo, I will focus on priority fixes.',
  'Based on your note, I would keep volume steady and reduce load for a week.',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [input, setInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: makeId(),
      role: 'bot',
      text: 'Hi! Share your training goal or attach a form photo for feedback.',
    },
    {
      id: makeId(),
      role: 'user',
      text: 'I want better squat depth. Any quick cues? ',
      status: 'sent',
    },
    {
      id: makeId(),
      role: 'bot',
      text: 'Start with a slightly wider stance and keep the weight mid-foot. Try 3 slow reps.',
    },
    {
      id: makeId(),
      role: 'user',
      text: 'Uploading a photo now.',
      status: 'failed',
      attachments: [
        {
          id: makeId(),
          kind: 'image',
          source: SAMPLE_IMAGE,
          label: 'Form photo',
        },
      ],
    },
  ]);
  const listRef = useRef<FlatList<Message>>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const replyIndex = useRef(0);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const handleAttach = () => {
    if (pendingAttachment) {
      setPendingAttachment(null);
      return;
    }
    setPendingAttachment({
      id: makeId(),
      kind: 'image',
      source: SAMPLE_IMAGE,
      label: 'Form photo',
    });
  };

  const sendDisabled = useMemo(() => {
    return input.trim().length === 0 && !pendingAttachment;
  }, [input, pendingAttachment]);

  const pushBotReply = () => {
    const nextText = BOT_REPLIES[replyIndex.current % BOT_REPLIES.length];
    replyIndex.current += 1;
    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: 'bot',
        text: nextText,
      },
    ]);
  };

  const markMessageStatus = (id: string, status: Message['status']) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, status } : message)),
    );
  };

  const simulateSend = (id: string) => {
    const sendTimer = setTimeout(() => {
      markMessageStatus(id, 'sent');
      const replyTimer = setTimeout(() => {
        pushBotReply();
      }, 600);
      timers.current.push(replyTimer);
    }, 900);
    timers.current.push(sendTimer);
  };

  const handleSend = () => {
    if (sendDisabled) {
      return;
    }
    const text = input.trim();
    const nextMessage: Message = {
      id: makeId(),
      role: 'user',
      text: text.length > 0 ? text : 'Photo attached.',
      status: 'sending',
      attachments: pendingAttachment ? [pendingAttachment] : undefined,
    };
    setMessages((prev) => [...prev, nextMessage]);
    setInput('');
    setPendingAttachment(null);
    simulateSend(nextMessage.id);
  };

  const handleRetry = (id: string) => {
    markMessageStatus(id, 'sending');
    simulateSend(id);
  };

  const renderAttachment = (attachment: Attachment) => {
    return (
      <View key={attachment.id} style={styles.attachmentWrap}>
        <Image source={attachment.source} style={styles.attachmentImage} />
        <Text style={[styles.attachmentLabel, { color: colors.mutedText }]}>{attachment.label}</Text>
      </View>
    );
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
            {item.attachments?.length ? (
              <View style={styles.attachmentGroup}>
                {item.attachments.map(renderAttachment)}
              </View>
            ) : null}
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

        {pendingAttachment ? (
          <View style={[styles.pendingAttachment, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Image source={pendingAttachment.source} style={styles.pendingImage} />
            <View style={styles.pendingTextWrap}>
              <Text style={[styles.pendingTitle, { color: colors.text }]}>{pendingAttachment.label}</Text>
              <Text style={[styles.pendingSubtitle, { color: colors.mutedText }]}>Ready to send</Text>
            </View>
            <Pressable
              style={[styles.removeButton, { borderColor: colors.border }]}
              onPress={() => setPendingAttachment(null)}>
              <Text style={[styles.removeButtonText, { color: colors.text }]}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

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
  attachmentGroup: {
    gap: 8,
  },
  attachmentWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 200,
    height: 120,
  },
  attachmentLabel: {
    fontSize: 11,
    paddingTop: 6,
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
  pendingAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  pendingImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  pendingTextWrap: {
    flex: 1,
    gap: 2,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  pendingSubtitle: {
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
});
