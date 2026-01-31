import { executeSql, generateId, queryAll, queryFirst } from '@/src/db/client';
import { BodyPart } from '@/src/models/types';

export async function createBodyPart(name: string): Promise<BodyPart> {
  const bodyPart: BodyPart = {
    id: generateId('body_part'),
    name,
  };
  await executeSql('INSERT OR IGNORE INTO body_parts (id, name, is_preset) VALUES (?, ?, 0);', [
    bodyPart.id,
    bodyPart.name,
  ]);
  const stored = await getBodyPartByName(name);
  return stored ?? bodyPart;
}

export async function getAllBodyParts(): Promise<BodyPart[]> {
  return queryAll<BodyPart>('SELECT id, name FROM body_parts ORDER BY name ASC;');
}

export async function getBodyPartByName(name: string): Promise<BodyPart | null> {
  return queryFirst<BodyPart>('SELECT id, name FROM body_parts WHERE name = ? LIMIT 1;', [name]);
}
