import { executeSql, generateId, queryAll, queryFirst } from '@/src/db/client';
import { Exercise } from '@/src/models/types';

export async function createExercise(name: string, bodyPart: string | null): Promise<Exercise> {
  const exercise: Exercise = {
    id: generateId('exercise'),
    name,
    bodyPart,
    memo: null,
  };
  await executeSql(`INSERT INTO exercises (id, name, body_part, memo) VALUES (?, ?, ?, ?);`, [
    exercise.id,
    exercise.name,
    exercise.bodyPart,
    exercise.memo,
  ]);
  return exercise;
}

export async function updateExerciseMemo(id: string, memo: string | null): Promise<void> {
  await executeSql(`UPDATE exercises SET memo = ? WHERE id = ?;`, [memo, id]);
}

export async function updateExerciseBodyPart(id: string, bodyPart: string | null): Promise<void> {
  await executeSql(`UPDATE exercises SET body_part = ? WHERE id = ?;`, [bodyPart, id]);
}

export async function getAllExercises(): Promise<Exercise[]> {
  return queryAll<Exercise>(`SELECT id, name, body_part as bodyPart, memo FROM exercises ORDER BY name ASC;`);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  return queryFirst<Exercise>(`SELECT id, name, body_part as bodyPart, memo FROM exercises WHERE id = ?;`, [id]);
}

export async function getExerciseByNameAndPart(
  name: string,
  bodyPart: string | null,
): Promise<Exercise | null> {
  return queryFirst<Exercise>(
    `SELECT id, name, body_part as bodyPart, memo FROM exercises WHERE name = ? AND body_part IS ? LIMIT 1;`,
    [name, bodyPart],
  );
}

export async function getExerciseByName(name: string): Promise<Exercise | null> {
  return queryFirst<Exercise>(
    `SELECT id, name, body_part as bodyPart, memo FROM exercises WHERE name = ? LIMIT 1;`,
    [name],
  );
}
