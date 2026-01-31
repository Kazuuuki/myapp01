import { executeSql, generateId, queryAll, queryFirst } from '@/src/db/client';
import { SetRecord, WorkoutSession } from '@/src/models/types';

export async function addSet(
  sessionId: string,
  exerciseId: string,
  weight: number,
  reps: number,
): Promise<SetRecord> {
  const setRecord: SetRecord = {
    id: generateId('set'),
    sessionId,
    exerciseId,
    weight,
    reps,
    createdAt: new Date().toISOString(),
  };
  await executeSql(
    `INSERT INTO set_records (id, session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
    [
      setRecord.id,
      setRecord.sessionId,
      setRecord.exerciseId,
      setRecord.weight,
      setRecord.reps,
      setRecord.createdAt,
    ],
  );
  return setRecord;
}

export async function updateSet(id: string, weight: number, reps: number): Promise<void> {
  await executeSql(`UPDATE set_records SET weight = ?, reps = ? WHERE id = ?;`, [weight, reps, id]);
}

export async function deleteSet(id: string): Promise<void> {
  await executeSql(`DELETE FROM set_records WHERE id = ?;`, [id]);
}

export async function restoreSet(setRecord: SetRecord): Promise<void> {
  await executeSql(
    `INSERT INTO set_records (id, session_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
    [
      setRecord.id,
      setRecord.sessionId,
      setRecord.exerciseId,
      setRecord.weight,
      setRecord.reps,
      setRecord.createdAt,
    ],
  );
}

export async function getSetById(id: string): Promise<SetRecord | null> {
  return queryFirst<SetRecord>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, weight, reps, created_at as createdAt
     FROM set_records WHERE id = ?;`,
    [id],
  );
}

export async function getSetsBySession(sessionId: string): Promise<SetRecord[]> {
  return queryAll<SetRecord>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, weight, reps, created_at as createdAt
     FROM set_records WHERE session_id = ? ORDER BY created_at ASC;`,
    [sessionId],
  );
}

export async function getLastSetByExercise(exerciseId: string): Promise<SetRecord | null> {
  return queryFirst<SetRecord>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, weight, reps, created_at as createdAt
     FROM set_records WHERE exercise_id = ? ORDER BY created_at DESC LIMIT 1;`,
    [exerciseId],
  );
}

export async function getLastSessionByExercise(exerciseId: string): Promise<WorkoutSession | null> {
  return queryFirst<WorkoutSession>(
    `SELECT ws.id as id, ws.date as date, ws.start_time as startTime
     FROM set_records sr
     JOIN workout_sessions ws ON ws.id = sr.session_id
     WHERE sr.exercise_id = ?
     ORDER BY sr.created_at DESC
     LIMIT 1;`,
    [exerciseId],
  );
}

export async function getRecentHistoryByExercise(
  exerciseId: string,
  limit: number,
): Promise<{ set: SetRecord; sessionDate: string }[]> {
  const rows = await queryAll<{
    id: string;
    sessionId: string;
    exerciseId: string;
    weight: number;
    reps: number;
    createdAt: string;
    sessionDate: string;
  }>(
    `SELECT sr.id as id, sr.session_id as sessionId, sr.exercise_id as exerciseId,
        sr.weight as weight, sr.reps as reps, sr.created_at as createdAt,
        ws.date as sessionDate
     FROM set_records sr
     JOIN workout_sessions ws ON ws.id = sr.session_id
     WHERE sr.exercise_id = ?
     ORDER BY sr.created_at DESC
     LIMIT ?;`,
    [exerciseId, limit],
  );

  return rows.map((row) => ({
    set: {
      id: row.id,
      sessionId: row.sessionId,
      exerciseId: row.exerciseId,
      weight: row.weight,
      reps: row.reps,
      createdAt: row.createdAt,
    },
    sessionDate: row.sessionDate,
  }));
}
