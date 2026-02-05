import { executeSql, queryFirst } from '@/src/db/client';
import { UserProfile, UserProfileExperienceLevel, UserProfileSex } from '@/src/models/types';

const DEFAULT_PROFILE_ID = 'default';

type UserProfileRow = {
  id: string;
  goal: string | null;
  frequencyPerWeek: number | null;
  sessionDurationMin: number | null;
  equipment: string | null;
  injuryOrPain: string | null;
  experienceLevel: string | null;
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  updatedAt: string;
};

function isExperienceLevel(value: string | null): value is UserProfileExperienceLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

function isSex(value: string | null): value is UserProfileSex {
  return value === 'male' || value === 'female' || value === 'other' || value === 'prefer_not_to_say';
}

function mapRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    goal: row.goal,
    frequencyPerWeek: row.frequencyPerWeek,
    sessionDurationMin: row.sessionDurationMin,
    equipment: row.equipment,
    injuryOrPain: row.injuryOrPain,
    experienceLevel: isExperienceLevel(row.experienceLevel) ? row.experienceLevel : null,
    age: row.age,
    sex: isSex(row.sex) ? row.sex : null,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    updatedAt: row.updatedAt,
  };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const row = await queryFirst<UserProfileRow>(
    `SELECT
      id,
      goal,
      frequency_per_week as frequencyPerWeek,
      session_duration_min as sessionDurationMin,
      equipment,
      injury_or_pain as injuryOrPain,
      experience_level as experienceLevel,
      age,
      sex,
      height_cm as heightCm,
      weight_kg as weightKg,
      updated_at as updatedAt
     FROM user_profile
     WHERE id = ?
     LIMIT 1;`,
    [DEFAULT_PROFILE_ID],
  );
  if (!row) {
    return null;
  }
  return mapRow(row);
}

export async function upsertUserProfile(
  profile: Omit<UserProfile, 'id' | 'updatedAt'>,
  updatedAt: string,
): Promise<UserProfile> {
  await executeSql(
    `INSERT INTO user_profile (
      id,
      goal,
      frequency_per_week,
      session_duration_min,
      equipment,
      injury_or_pain,
      experience_level,
      age,
      sex,
      height_cm,
      weight_kg,
      updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      goal = excluded.goal,
      frequency_per_week = excluded.frequency_per_week,
      session_duration_min = excluded.session_duration_min,
      equipment = excluded.equipment,
      injury_or_pain = excluded.injury_or_pain,
      experience_level = excluded.experience_level,
      age = excluded.age,
      sex = excluded.sex,
      height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg,
      updated_at = excluded.updated_at;`,
    [
      DEFAULT_PROFILE_ID,
      profile.goal,
      profile.frequencyPerWeek,
      profile.sessionDurationMin,
      profile.equipment,
      profile.injuryOrPain,
      profile.experienceLevel,
      profile.age,
      profile.sex,
      profile.heightCm,
      profile.weightKg,
      updatedAt,
    ],
  );

  return {
    id: DEFAULT_PROFILE_ID,
    ...profile,
    updatedAt,
  };
}

export async function deleteUserProfile(): Promise<void> {
  await executeSql(`DELETE FROM user_profile WHERE id = ?;`, [DEFAULT_PROFILE_ID]);
}

