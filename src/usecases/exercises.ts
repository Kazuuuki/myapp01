import { BodyPart, Exercise } from '@/src/models/types';
import { createBodyPart, getAllBodyParts, getBodyPartByName } from '@/src/repo/bodyPartRepo';
import { getExercisesByBodyPart } from '@/src/repo/exerciseRepo';

export async function listBodyParts(): Promise<BodyPart[]> {
  return getAllBodyParts();
}

export async function listExercisesByBodyPart(bodyPartName: string): Promise<Exercise[]> {
  return getExercisesByBodyPart(bodyPartName);
}

export async function ensureBodyPart(name: string): Promise<BodyPart> {
  const existing = await getBodyPartByName(name);
  if (existing) {
    return existing;
  }
  return createBodyPart(name);
}
