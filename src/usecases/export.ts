import { queryAll } from '@/src/db/client';
import { Exercise, SessionExercise, SetRecord, WorkoutSession } from '@/src/models/types';

export async function exportAllToJson(): Promise<string> {
  const sessions = await queryAll<WorkoutSession>(
    `SELECT id, date, start_time as startTime FROM workout_sessions ORDER BY date ASC;`,
  );
  const exercises = await queryAll<Exercise>(
    `SELECT id, name, body_part as bodyPart, memo FROM exercises ORDER BY name ASC;`,
  );
  const sessionExercises = await queryAll<SessionExercise>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, position FROM session_exercises ORDER BY session_id ASC, position ASC;`,
  );
  const sets = await queryAll<SetRecord>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, weight, reps, memo, created_at as createdAt
     FROM set_records ORDER BY created_at ASC;`,
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    sessions,
    exercises,
    sessionExercises,
    sets,
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportSetsToCsv(): Promise<string> {
  const rows = await queryAll<SetRecord>(
    `SELECT id, session_id as sessionId, exercise_id as exerciseId, weight, reps, memo, created_at as createdAt
     FROM set_records ORDER BY created_at ASC;`,
  );

  const header = ['id', 'session_id', 'exercise_id', 'weight', 'reps', 'memo', 'created_at'];
  const lines = [header.join(',')];

  for (const row of rows) {
    const line = [
      row.id,
      row.sessionId,
      row.exerciseId,
      row.weight.toString(),
      row.reps.toString(),
      row.memo ?? '',
      row.createdAt,
    ];
    lines.push(line.join(','));
  }

  return lines.join('\n');
}
