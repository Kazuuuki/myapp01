import { ExerciseWithSets, WorkoutSession } from '@/src/models/types';
import {
  addExerciseToSession,
  createSession,
  deleteExerciseFromSession,
  getExercisesBySession,
  getSessionByDate,
} from '@/src/repo/workoutRepo';
import {
  createExercise,
  getExerciseByName,
  getExerciseByNameAndPart,
  updateExerciseBodyPart,
} from '@/src/repo/exerciseRepo';
import {
  addSet,
  deleteSet,
  deleteSetsBySessionAndExercise,
  getLastSessionByExerciseBeforeDate,
  getLastSetByExercise,
  getSetsBySession,
  getSetsBySessionAndExercise,
  updateSet,
} from '@/src/repo/setRepo';

export async function getOrCreateSessionByDate(date: string): Promise<WorkoutSession> {
  const existing = await getSessionByDate(date);
  if (existing) {
    return existing;
  }
  return createSession(date, new Date().toISOString());
}

export async function getOrCreateTodaySession(date: string): Promise<WorkoutSession> {
  return getOrCreateSessionByDate(date);
}

export async function addExerciseToToday(sessionId: string, exerciseId: string) {
  return addExerciseToSession(sessionId, exerciseId);
}

export async function removeExerciseFromToday(sessionId: string, exerciseId: string) {
  await deleteExerciseFromSession(sessionId, exerciseId);
}

export async function createExerciseAndAddToToday(
  sessionId: string,
  name: string,
  bodyPart: string | null,
) {
  const existing = await getExerciseByNameAndPart(name, bodyPart);
  if (existing) {
    await addExerciseToSession(sessionId, existing.id);
    return existing;
  }

  const fallback = await getExerciseByName(name);
  if (fallback) {
    if (!fallback.bodyPart && bodyPart) {
      await updateExerciseBodyPart(fallback.id, bodyPart);
    }
    await addExerciseToSession(sessionId, fallback.id);
    return fallback;
  }

  const exercise = await createExercise(name, bodyPart);
  await addExerciseToSession(sessionId, exercise.id);
  return exercise;
}

export async function getTodayExercises(sessionId: string, date: string): Promise<ExerciseWithSets[]> {
  const exercises = await getExercisesBySession(sessionId);
  const sets = await getSetsBySession(sessionId);

  const grouped = new Map<string, ExerciseWithSets>();

  for (const entry of exercises) {
    grouped.set(entry.exercise.id, {
      exercise: entry.exercise,
      position: entry.position,
      sets: [],
      lastSet: null,
      lastSessionDate: null,
      lastSessionSets: [],
    });
  }

  for (const set of sets) {
    const item = grouped.get(set.exerciseId);
    if (item) {
      item.sets.push(set);
    }
  }

  for (const item of grouped.values()) {
    item.lastSet = await getLastSetByExercise(item.exercise.id);
    const lastSession = await getLastSessionByExerciseBeforeDate(item.exercise.id, date);
    if (lastSession) {
      item.lastSessionDate = lastSession.date;
      item.lastSessionSets = await getSetsBySessionAndExercise(lastSession.id, item.exercise.id);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.position - b.position);
}

export async function addSetQuick(sessionId: string, exerciseId: string) {
  const lastSet = await getLastSetByExercise(exerciseId);
  const weight = lastSet?.weight ?? 0;
  const reps = lastSet?.reps ?? 10;
  return addSet(sessionId, exerciseId, weight, reps, null);
}

export async function updateSetQuick(setId: string, weight: number, reps: number, memo: string | null) {
  await updateSet(setId, weight, reps, memo);
}

export async function deleteSetQuick(setId: string) {
  await deleteSet(setId);
}

export async function pastePreviousSetsToSession(
  sessionId: string,
  exerciseId: string,
  date: string,
): Promise<boolean> {
  const lastSession = await getLastSessionByExerciseBeforeDate(exerciseId, date);
  if (!lastSession) {
    return false;
  }
  const previousSets = await getSetsBySessionAndExercise(lastSession.id, exerciseId);
  if (previousSets.length === 0) {
    return false;
  }
  await deleteSetsBySessionAndExercise(sessionId, exerciseId);
  for (const set of previousSets) {
    await addSet(sessionId, exerciseId, set.weight, set.reps, set.memo ?? null);
  }
  return true;
}
