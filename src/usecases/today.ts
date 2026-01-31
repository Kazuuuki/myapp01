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
import { addSet, deleteSet, getLastSetByExercise, getSetById, getSetsBySession, restoreSet, updateSet } from '@/src/repo/setRepo';
import { getLastAction, setLastAction } from '@/src/state/lastAction';

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

export async function getTodayExercises(sessionId: string): Promise<ExerciseWithSets[]> {
  const exercises = await getExercisesBySession(sessionId);
  const sets = await getSetsBySession(sessionId);

  const grouped = new Map<string, ExerciseWithSets>();

  for (const entry of exercises) {
    grouped.set(entry.exercise.id, {
      exercise: entry.exercise,
      position: entry.position,
      sets: [],
      lastSet: null,
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
  }

  return Array.from(grouped.values()).sort((a, b) => a.position - b.position);
}

export async function addSetQuick(sessionId: string, exerciseId: string) {
  const lastSet = await getLastSetByExercise(exerciseId);
  const weight = lastSet?.weight ?? 0;
  const reps = lastSet?.reps ?? 10;
  const created = await addSet(sessionId, exerciseId, weight, reps);
  setLastAction({ type: 'add_set', setId: created.id });
  return created;
}

export async function updateSetQuick(setId: string, weight: number, reps: number) {
  const previous = await getSetById(setId);
  if (!previous) {
    return;
  }
  setLastAction({ type: 'update_set', setId, previousWeight: previous.weight, previousReps: previous.reps });
  await updateSet(setId, weight, reps);
}

export async function undoLastAction() {
  const lastAction = getLastAction();
  if (!lastAction) {
    return false;
  }

  if (lastAction.type === 'add_set') {
    await deleteSet(lastAction.setId);
  }
  if (lastAction.type === 'update_set') {
    await updateSet(lastAction.setId, lastAction.previousWeight, lastAction.previousReps);
  }
  if (lastAction.type === 'delete_set') {
    await restoreSet(lastAction.set);
  }

  setLastAction(null);
  return true;
}
