import { queryAll, queryFirst } from '@/src/db/client';
import { SessionDateSummary, SessionDetail, SessionWithStats, SetRecord, WorkoutSession } from '@/src/models/types';
import { getExercisesBySession, getSessionByDate } from '@/src/repo/workoutRepo';
import { getSetsBySession } from '@/src/repo/setRepo';

export async function listSessionsWithStats(): Promise<SessionWithStats[]> {
  return queryAll<SessionWithStats>(
    `SELECT ws.id as id, ws.date as date, ws.start_time as startTime,
        COUNT(DISTINCT se.exercise_id) as exerciseCount,
        COUNT(sr.id) as setCount
     FROM workout_sessions ws
     LEFT JOIN session_exercises se ON se.session_id = ws.id
     LEFT JOIN set_records sr ON sr.session_id = ws.id
     GROUP BY ws.id
     ORDER BY ws.date DESC, ws.start_time DESC;`,
  );
}

export async function listSessionDatesInRange(
  startDate: string,
  endDate: string,
): Promise<SessionDateSummary[]> {
  return queryAll<SessionDateSummary>(
    `SELECT ws.date as date,
        MIN(ws.id) as sessionId,
        COUNT(DISTINCT se.exercise_id) as exerciseCount,
        COUNT(sr.id) as setCount
     FROM workout_sessions ws
     LEFT JOIN session_exercises se ON se.session_id = ws.id
     LEFT JOIN set_records sr ON sr.session_id = ws.id
     WHERE ws.date BETWEEN ? AND ?
     GROUP BY ws.date
     ORDER BY ws.date ASC;`,
    [startDate, endDate],
  );
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const session = await queryFirst<WorkoutSession>(
    `SELECT id, date, start_time as startTime FROM workout_sessions WHERE id = ?;`,
    [sessionId],
  );
  if (!session) {
    return null;
  }

  const exercises = await getExercisesBySession(sessionId);
  const sets = await getSetsBySession(sessionId);
  const grouped = new Map<string, SetRecord[]>();

  for (const set of sets) {
    const list = grouped.get(set.exerciseId) ?? [];
    list.push(set);
    grouped.set(set.exerciseId, list);
  }

  const items = exercises.map((entry) => ({
    exercise: entry.exercise,
    sets: grouped.get(entry.exercise.id) ?? [],
    position: entry.position,
  }));

  return { session, items };
}

export async function getSessionByDateWithDetail(date: string): Promise<SessionDetail | null> {
  const session = await getSessionByDate(date);
  if (!session) {
    return null;
  }
  return getSessionDetail(session.id);
}
