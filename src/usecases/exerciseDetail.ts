import { queryFirst } from '@/src/db/client';
import { ExerciseSummary } from '@/src/models/types';
import { getExerciseById } from '@/src/repo/exerciseRepo';
import { getRecentHistoryByExercise } from '@/src/repo/setRepo';

export async function getExerciseSummary(exerciseId: string): Promise<ExerciseSummary | null> {
  const exercise = await getExerciseById(exerciseId);
  if (!exercise) {
    return null;
  }

  const recent = await getRecentHistoryByExercise(exerciseId, 5);

  const stats = await queryFirst<{
    maxWeight: number | null;
    maxReps: number | null;
    maxVolume: number | null;
  }>(
    `SELECT MAX(weight) as maxWeight, MAX(reps) as maxReps, MAX(weight * reps) as maxVolume
     FROM set_records WHERE exercise_id = ?;`,
    [exerciseId],
  );

  return {
    exercise,
    recent,
    bestVolume: stats?.maxVolume ?? null,
    maxWeight: stats?.maxWeight ?? null,
    maxReps: stats?.maxReps ?? null,
  };
}
