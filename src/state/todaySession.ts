import { useCallback, useEffect, useState } from 'react';

import { ExerciseWithSets, WorkoutSession } from '@/src/models/types';
import {
  addExerciseToToday,
  addSetQuick,
  createExerciseAndAddToToday,
  deleteSetQuick,
  getOrCreateSessionByDate,
  getTodayExercises,
  pastePreviousSetsToSession,
  removeExerciseFromToday,
  undoLastAction,
  updateSetQuick,
} from '@/src/usecases/today';
import { getLastAction } from '@/src/state/lastAction';

export function useTodaySession(date: string) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) {
      return;
    }
    const items = await getTodayExercises(session.id, date);
    setExercises(items);
    setUndoAvailable(!!getLastAction());
  }, [session]);

  const init = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getOrCreateSessionByDate(date);
      setSession(current);
      const items = await getTodayExercises(current.id, date);
      setExercises(items);
      setUndoAvailable(!!getLastAction());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    init();
  }, [init]);

  const addExercise = useCallback(
    async (name: string, bodyPart: string | null) => {
      if (!session) {
        return;
      }
      await createExerciseAndAddToToday(session.id, name, bodyPart);
      await refresh();
    },
    [refresh, session],
  );

  const addExistingExercise = useCallback(
    async (exerciseId: string) => {
      if (!session) {
        return;
      }
      await addExerciseToToday(session.id, exerciseId);
      await refresh();
    },
    [refresh, session],
  );

  const removeExercise = useCallback(
    async (exerciseId: string) => {
      if (!session) {
        return;
      }
      await removeExerciseFromToday(session.id, exerciseId);
      await refresh();
    },
    [refresh, session],
  );

  const addSet = useCallback(
    async (exerciseId: string) => {
      if (!session) {
        return;
      }
      await addSetQuick(session.id, exerciseId);
      await refresh();
    },
    [refresh, session],
  );

  const updateSet = useCallback(
    async (setId: string, weight: number, reps: number) => {
      await updateSetQuick(setId, weight, reps);
      await refresh();
    },
    [refresh],
  );

  const removeSet = useCallback(
    async (setId: string) => {
      await deleteSetQuick(setId);
      await refresh();
    },
    [refresh],
  );

  const pastePreviousSets = useCallback(
    async (exerciseId: string) => {
      if (!session) {
        return false;
      }
      const didPaste = await pastePreviousSetsToSession(session.id, exerciseId, date);
      if (didPaste) {
        await refresh();
      }
      return didPaste;
    },
    [date, refresh, session],
  );

  const undo = useCallback(async () => {
    const didUndo = await undoLastAction();
    if (didUndo) {
      await refresh();
    }
  }, [refresh]);

  return {
    session,
    exercises,
    loading,
    error,
    addExercise,
    addExistingExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    pastePreviousSets,
    undo,
    undoAvailable,
    refresh,
  };
}
