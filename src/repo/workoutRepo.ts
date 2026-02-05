import { executeSql, generateId, queryAll, queryFirst } from '@/src/db/client';
import { Exercise, SessionExercise, WorkoutSession } from '@/src/models/types';

function parseImageUris(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return [];
  }
  return [];
}

export async function createSession(date: string, startTime: string): Promise<WorkoutSession> {
  const session: WorkoutSession = {
    id: generateId('session'),
    date,
    startTime,
  };
  await executeSql(
    `INSERT INTO workout_sessions (id, date, start_time) VALUES (?, ?, ?);`,
    [session.id, session.date, session.startTime],
  );
  return session;
}

export async function getSessionByDate(date: string): Promise<WorkoutSession | null> {
  return queryFirst<WorkoutSession>(
    `SELECT id, date, start_time as startTime FROM workout_sessions WHERE date = ? LIMIT 1;`,
    [date],
  );
}

export async function getRecentSessions(limit: number): Promise<WorkoutSession[]> {
  return queryAll<WorkoutSession>(
    `SELECT id, date, start_time as startTime FROM workout_sessions ORDER BY date DESC, start_time DESC LIMIT ?;`,
    [limit],
  );
}

export async function deleteAll(): Promise<void> {
  await executeSql('DELETE FROM user_profile;');
  await executeSql('DELETE FROM chat_messages;');
  await executeSql('DELETE FROM chat_threads;');
  await executeSql('DELETE FROM set_records;');
  await executeSql('DELETE FROM session_exercises;');
  await executeSql('DELETE FROM exercises;');
  await executeSql('DELETE FROM workout_sessions;');
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
): Promise<SessionExercise> {
  const existing = await queryFirst<SessionExercise>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, position
     FROM session_exercises WHERE session_id = ? AND exercise_id = ? LIMIT 1;`,
    [sessionId, exerciseId],
  );
  if (existing) {
    return existing;
  }

  const maxPositionRow = await queryFirst<{ maxPosition: number }>(
    `SELECT MAX(position) as maxPosition FROM session_exercises WHERE session_id = ?;`,
    [sessionId],
  );
  const position = (maxPositionRow?.maxPosition ?? -1) + 1;

  const sessionExercise: SessionExercise = {
    id: generateId('session_exercise'),
    sessionId,
    exerciseId,
    position,
  };

  await executeSql(
    `INSERT INTO session_exercises (id, session_id, exercise_id, position) VALUES (?, ?, ?, ?);`,
    [sessionExercise.id, sessionExercise.sessionId, sessionExercise.exerciseId, sessionExercise.position],
  );

  return sessionExercise;
}

export async function deleteExerciseFromSession(sessionId: string, exerciseId: string): Promise<void> {
  await executeSql(
    `DELETE FROM set_records WHERE session_id = ? AND exercise_id = ?;`,
    [sessionId, exerciseId],
  );
  await executeSql(
    `DELETE FROM session_exercises WHERE session_id = ? AND exercise_id = ?;`,
    [sessionId, exerciseId],
  );
}

export async function getExercisesBySession(
  sessionId: string,
): Promise<{ exercise: Exercise; position: number }[]> {
  return queryAll<{
    id: string;
    name: string;
    bodyPart: string | null;
    memo: string | null;
    imageUris: string | null;
    position: number;
  }>(
    `SELECT e.id as id, e.name as name, e.body_part as bodyPart, e.memo as memo, e.image_uris as imageUris, se.position as position
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ?
     ORDER BY se.position ASC;`,
    [sessionId],
  ).then((rows) =>
    rows.map((row) => ({
      exercise: {
        id: row.id,
        name: row.name,
        bodyPart: row.bodyPart ?? null,
        memo: row.memo ?? null,
        images: parseImageUris(row.imageUris),
      },
      position: row.position,
    })),
  );
}
