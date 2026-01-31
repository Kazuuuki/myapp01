import { executeSql, generateId, queryAll, queryFirst } from '@/src/db/client';
import { Exercise } from '@/src/models/types';

type ExerciseRow = {
  id: string;
  name: string;
  bodyPart: string | null;
  memo: string | null;
  imageUris: string | null;
};

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

function serializeImageUris(images: string[]): string | null {
  if (!images.length) {
    return null;
  }
  return JSON.stringify(images);
}

function mapExerciseRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    bodyPart: row.bodyPart ?? null,
    memo: row.memo ?? null,
    images: parseImageUris(row.imageUris),
  };
}

export async function createExercise(name: string, bodyPart: string | null): Promise<Exercise> {
  const exercise: Exercise = {
    id: generateId('exercise'),
    name,
    bodyPart,
    memo: null,
    images: [],
  };
  await executeSql(`INSERT INTO exercises (id, name, body_part, memo, image_uris) VALUES (?, ?, ?, ?, ?);`, [
    exercise.id,
    exercise.name,
    exercise.bodyPart,
    exercise.memo,
    serializeImageUris(exercise.images),
  ]);
  return exercise;
}

export async function updateExerciseMemo(id: string, memo: string | null): Promise<void> {
  await executeSql(`UPDATE exercises SET memo = ? WHERE id = ?;`, [memo, id]);
}

export async function updateExerciseBodyPart(id: string, bodyPart: string | null): Promise<void> {
  await executeSql(`UPDATE exercises SET body_part = ? WHERE id = ?;`, [bodyPart, id]);
}

export async function updateExerciseImages(id: string, images: string[]): Promise<void> {
  await executeSql(`UPDATE exercises SET image_uris = ? WHERE id = ?;`, [serializeImageUris(images), id]);
}

export async function getAllExercises(): Promise<Exercise[]> {
  const rows = await queryAll<ExerciseRow>(
    `SELECT id, name, body_part as bodyPart, memo, image_uris as imageUris FROM exercises ORDER BY name ASC;`,
  );
  return rows.map(mapExerciseRow);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const row = await queryFirst<ExerciseRow>(
    `SELECT id, name, body_part as bodyPart, memo, image_uris as imageUris FROM exercises WHERE id = ?;`,
    [id],
  );
  return row ? mapExerciseRow(row) : null;
}

export async function getExerciseByNameAndPart(
  name: string,
  bodyPart: string | null,
): Promise<Exercise | null> {
  const row = await queryFirst<ExerciseRow>(
    `SELECT id, name, body_part as bodyPart, memo, image_uris as imageUris
     FROM exercises WHERE name = ? AND body_part IS ? LIMIT 1;`,
    [name, bodyPart],
  );
  return row ? mapExerciseRow(row) : null;
}

export async function getExerciseByName(name: string): Promise<Exercise | null> {
  const row = await queryFirst<ExerciseRow>(
    `SELECT id, name, body_part as bodyPart, memo, image_uris as imageUris FROM exercises WHERE name = ? LIMIT 1;`,
    [name],
  );
  return row ? mapExerciseRow(row) : null;
}

export async function getExercisesByBodyPart(bodyPart: string): Promise<Exercise[]> {
  const rows = await queryAll<ExerciseRow>(
    `SELECT id, name, body_part as bodyPart, memo, image_uris as imageUris
     FROM exercises
     WHERE body_part = ?
     ORDER BY name ASC;`,
    [bodyPart],
  );
  return rows.map(mapExerciseRow);
}
