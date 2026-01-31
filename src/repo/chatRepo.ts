import { executeSql, generateId, queryAll, queryFirst } from '@/src/db/client';
import { ChatMessage, ChatMessageRole, ChatThread, ChatThreadSummary } from '@/src/models/types';

type ChatThreadRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastMessageRole: ChatMessageRole | null;
};

type ChatMessageRow = {
  id: string;
  threadId: string;
  role: ChatMessageRole;
  text: string;
  createdAt: string;
};

function mapThreadRow(row: ChatThreadRow): ChatThreadSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastMessageText: row.lastMessageText ?? null,
    lastMessageAt: row.lastMessageAt ?? null,
    lastMessageRole: row.lastMessageRole ?? null,
  };
}

function mapMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role,
    text: row.text,
    createdAt: row.createdAt,
  };
}

export async function createChatThread(title: string, createdAt: string): Promise<ChatThread> {
  const thread: ChatThread = {
    id: generateId('chat_thread'),
    title,
    createdAt,
    updatedAt: createdAt,
  };
  await executeSql(`INSERT INTO chat_threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?);`, [
    thread.id,
    thread.title,
    thread.createdAt,
    thread.updatedAt,
  ]);
  return thread;
}

export async function updateChatThreadTitle(id: string, title: string, updatedAt: string): Promise<void> {
  await executeSql(`UPDATE chat_threads SET title = ?, updated_at = ? WHERE id = ?;`, [title, updatedAt, id]);
}

export async function touchChatThread(id: string, updatedAt: string): Promise<void> {
  await executeSql(`UPDATE chat_threads SET updated_at = ? WHERE id = ?;`, [updatedAt, id]);
}

export async function getChatThreadById(id: string): Promise<ChatThread | null> {
  const row = await queryFirst<ChatThreadRow>(
    `SELECT id, title, created_at as createdAt, updated_at as updatedAt,
      NULL as lastMessageText, NULL as lastMessageAt, NULL as lastMessageRole
     FROM chat_threads WHERE id = ? LIMIT 1;`,
    [id],
  );
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listChatThreads(): Promise<ChatThreadSummary[]> {
  const rows = await queryAll<ChatThreadRow>(
    `SELECT t.id,
      t.title,
      t.created_at as createdAt,
      t.updated_at as updatedAt,
      (SELECT m.text FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) as lastMessageText,
      (SELECT m.created_at FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) as lastMessageAt,
      (SELECT m.role FROM chat_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) as lastMessageRole
     FROM chat_threads t
     ORDER BY t.updated_at DESC;`,
  );
  return rows.map(mapThreadRow);
}

export async function listChatMessagesByThread(threadId: string): Promise<ChatMessage[]> {
  const rows = await queryAll<ChatMessageRow>(
    `SELECT id, thread_id as threadId, role, text, created_at as createdAt
     FROM chat_messages
     WHERE thread_id = ?
     ORDER BY created_at ASC;`,
    [threadId],
  );
  return rows.map(mapMessageRow);
}

export async function addChatMessage(
  threadId: string,
  role: ChatMessageRole,
  text: string,
  createdAt: string,
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: generateId('chat_msg'),
    threadId,
    role,
    text,
    createdAt,
  };
  await executeSql(
    `INSERT INTO chat_messages (id, thread_id, role, text, created_at) VALUES (?, ?, ?, ?, ?);`,
    [message.id, message.threadId, message.role, message.text, message.createdAt],
  );
  return message;
}

export async function deleteChatThread(id: string): Promise<void> {
  await executeSql(`DELETE FROM chat_threads WHERE id = ?;`, [id]);
}
