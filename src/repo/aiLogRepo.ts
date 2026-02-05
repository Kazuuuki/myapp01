import { executeSql, generateId } from '@/src/db/client';

export type AiLogKind = 'today_menu';

export type CreateAiLogInput = {
  kind: AiLogKind;
  date: string | null;
  requestText: string;
  responseText: string | null;
  parsedJson: string | null;
  error: string | null;
  createdAt: string; // ISO
};

export async function createAiLog(input: CreateAiLogInput): Promise<void> {
  await executeSql(
    `INSERT INTO ai_logs (id, kind, date, request_text, response_text, parsed_json, error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      generateId('ai_log'),
      input.kind,
      input.date,
      input.requestText,
      input.responseText,
      input.parsedJson,
      input.error,
      input.createdAt,
    ],
  );
}

