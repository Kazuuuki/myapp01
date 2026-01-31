import * as SQLite from 'expo-sqlite';

import { BODY_PARTS } from '@/src/models/exercises';
import { schemaStatements } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let readyPromise: Promise<void> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('workout.db');
  }
  return dbPromise;
}

export function ensureDbReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = initDb();
  }
  return readyPromise;
}

async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(schemaStatements.join('\n'));
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises);');
  const hasBodyPart = columns.some((column) => column.name === 'body_part');
  if (!hasBodyPart) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN body_part TEXT;');
  }
  const setColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(set_records);');
  const hasSetMemo = setColumns.some((column) => column.name === 'memo');
  if (!hasSetMemo) {
    await db.execAsync('ALTER TABLE set_records ADD COLUMN memo TEXT;');
  }
  await seedPresetExercises(db);
}

async function seedPresetExercises(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const part of BODY_PARTS) {
    const bodyPartId = generateId('body_part');
    await db.runAsync('INSERT OR IGNORE INTO body_parts (id, name, is_preset) VALUES (?, ?, 1);', [
      bodyPartId,
      part.label,
    ]);

    for (const exerciseName of part.exercises) {
      const exerciseId = generateId('exercise');
      await db.runAsync(
        'INSERT OR IGNORE INTO exercises (id, name, body_part, memo) VALUES (?, ?, ?, NULL);',
        [exerciseId, exerciseName, part.label],
      );
    }
  }
}

export async function executeSql(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<SQLite.SQLiteRunResult> {
  const db = await getDb();
  await ensureDbReady();
  return db.runAsync(sql, params);
}

export async function queryAll<T>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T[]> {
  const db = await getDb();
  await ensureDbReady();
  return db.getAllAsync<T>(sql, params);
}

export async function queryFirst<T>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T | null> {
  const db = await getDb();
  await ensureDbReady();
  return db.getFirstAsync<T>(sql, params);
}

export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`;
}
