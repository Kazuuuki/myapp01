import { ChatMessage, ChatThread, ChatThreadSummary } from '@/src/models/types';
import {
  addChatMessage,
  createChatThread as createChatThreadRepo,
  deleteChatThread as deleteChatThreadRepo,
  getChatThreadById,
  listChatMessagesByThread,
  listChatThreads as listChatThreadsRepo,
  touchChatThread as touchChatThreadRepo,
  updateChatThreadTitle as updateChatThreadTitleRepo,
} from '@/src/repo/chatRepo';

export const DEFAULT_CHAT_TITLE = 'New chat';
export const DEFAULT_GREETING = 'Hi! Share your training goal or attach a form photo for feedback.';

export async function listChatThreads(): Promise<ChatThreadSummary[]> {
  return listChatThreadsRepo();
}

export async function createChatThread(): Promise<ChatThread> {
  const now = new Date().toISOString();
  const thread = await createChatThreadRepo(DEFAULT_CHAT_TITLE, now);
  await addChatMessage(thread.id, 'bot', DEFAULT_GREETING, now);
  return thread;
}

export async function getChatThread(id: string): Promise<ChatThread | null> {
  return getChatThreadById(id);
}

export async function listChatMessages(threadId: string): Promise<ChatMessage[]> {
  return listChatMessagesByThread(threadId);
}

export async function addThreadMessage(
  threadId: string,
  role: 'user' | 'bot',
  text: string,
  createdAt: string,
): Promise<ChatMessage> {
  return addChatMessage(threadId, role, text, createdAt);
}

export async function updateChatThreadTitle(threadId: string, title: string, updatedAt: string): Promise<void> {
  await updateChatThreadTitleRepo(threadId, title, updatedAt);
}

export async function touchChatThread(threadId: string, updatedAt: string): Promise<void> {
  await touchChatThreadRepo(threadId, updatedAt);
}

export async function deleteChatThread(threadId: string): Promise<void> {
  await deleteChatThreadRepo(threadId);
}

export function deriveThreadTitle(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return DEFAULT_CHAT_TITLE;
  }
  return normalized.length > 40 ? `${normalized.slice(0, 40)}…` : normalized;
}
