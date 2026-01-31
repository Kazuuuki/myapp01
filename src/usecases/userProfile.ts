import { UserProfile } from '@/src/models/types';
import { getUserProfile as getUserProfileRepo, upsertUserProfile as upsertUserProfileRepo } from '@/src/repo/userProfileRepo';

export async function getUserProfile(): Promise<UserProfile | null> {
  return getUserProfileRepo();
}

export async function saveUserProfile(profile: Omit<UserProfile, 'id' | 'updatedAt'>): Promise<UserProfile> {
  const updatedAt = new Date().toISOString();
  return upsertUserProfileRepo(profile, updatedAt);
}

function maybeLine(label: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }
  return `${label}: ${String(value).trim()}`;
}

export function formatUserProfileForPrompt(profile: UserProfile): string {
  const fields: (string | null)[] = [
    maybeLine('goal', profile.goal),
    maybeLine('frequency_per_week', profile.frequencyPerWeek),
    maybeLine('session_duration_min', profile.sessionDurationMin),
    maybeLine('equipment', profile.equipment),
    maybeLine('injury_or_pain', profile.injuryOrPain),
    maybeLine('experience_level', profile.experienceLevel),
    maybeLine('age', profile.age),
    maybeLine('sex', profile.sex),
    maybeLine('height_cm', profile.heightCm),
    maybeLine('weight_kg', profile.weightKg),
  ];

  const content = fields.filter((line): line is string => Boolean(line)).join('\n').trim();
  if (!content) {
    return '';
  }
  return `# Profile\n${content}`.trim();
}
