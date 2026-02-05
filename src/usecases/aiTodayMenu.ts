import { AI_CHAT_ENDPOINT, buildAiChatRequest } from '@/constants/ai-config';
import { formatUserProfileForPrompt, getUserProfile } from '@/src/usecases/userProfile';
import { getRecentSessions, getExercisesBySession } from '@/src/repo/workoutRepo';
import { createExerciseAndAddToToday } from '@/src/usecases/today';
import { addSet, getLastSetByExercise } from '@/src/repo/setRepo';

export type TodayMenuRequestOptions = {
  selectedBodyPart: string;
  timeLimitMin?: number;
  todayGoal?: string;
  applyStrategy: 'append' | 'replace';
};

export type AiTodayMenu = {
  version: 1;
  title: string;
  warnings: string[];
  rationale: string[];
  items: {
    bodyPart: string;
    exerciseName: string;
    note?: string | null;
    sets: {
      reps: number;
      weight: number | null;
      rpe?: number;
      restSec?: number;
      memo?: string | null;
    }[];
  }[];
  cooldown: string[];
};

export const TODAY_MENU_SYSTEM_EXTRA = `
あなたはトレーニングメニュー作成アシスタントです。出力は必ずJSONのみ（先頭と末尾が { }）で、追加の文章・コードフェンス・Markdownは一切出力しないでください。

次のJSONスキーマに厳密に従ってください（キー名を変えない）:
- version: number (1)
- title: string
- warnings: string[]
- rationale: string[]
- items: { bodyPart: string, exerciseName: string, sets: { reps: number, weight: number|null, rpe?: number, restSec?: number, memo?: string|null }[], note?: string|null }[]
- cooldown: string[]

制約:
- reps は必ず整数（例 8, 10, 12）。範囲表現は禁止。
- weight は原則 null（ユーザーの履歴が明確にあり、推奨重量を述べる合理性がある場合のみ数値でも可）。
- 痛み/違和感の情報がある場合、安全を優先し回避・代替・ボリューム調整を行う。
- 医療行為ではない旨を warnings に必ず含める。
`.trim();

function safeDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === 'string' && tz.trim()) return tz.trim();
  } catch {
    // ignore
  }
  return 'UTC';
}

export async function buildRecentTrainingSummary(todayDate: string, selectedBodyPart: string): Promise<string> {
  const sessions = await getRecentSessions(12);
  const recent = sessions.filter((session) => session.date < todayDate).slice(0, 5);

  if (recent.length === 0) {
    return [
      'recent_sessions:',
      '(none)',
      '',
      'last_done_for_selected_part: unknown',
      'note: 履歴が少ない場合は初心者向け・安全寄りに提案してください',
    ].join('\n');
  }

  const lines: string[] = ['recent_sessions:'];
  let lastDoneForPart: string | null = null;

  for (const session of recent) {
    const items = await getExercisesBySession(session.id);
    const names = items.map((item) => item.exercise.name).slice(0, 6);
    lines.push(`- ${session.date}: ${names.join(', ')}`);
    if (!lastDoneForPart) {
      const didHitPart = items.some((item) => (item.exercise.bodyPart ?? null) === selectedBodyPart);
      if (didHitPart) {
        lastDoneForPart = session.date;
      }
    }
  }

  lines.push('');
  lines.push(`last_done_for_selected_part: ${lastDoneForPart ?? 'unknown'}`);
  lines.push('note: 履歴が少ない場合は初心者向け・安全寄りに提案してください');
  return lines.join('\n');
}

export function buildTodayMenuText(
  date: string,
  options: TodayMenuRequestOptions,
  profileBlock: string,
  recentSummary: string,
): string {
  const timezone = safeDeviceTimezone();
  const timeLimit = options.timeLimitMin ? String(options.timeLimitMin) : 'unknown';
  const goal = options.todayGoal?.trim() ? options.todayGoal.trim() : 'unknown';

  return [
    '<<TODAY_MENU_REQUEST>>',
    `date: ${date}`,
    `selected_body_part: ${options.selectedBodyPart}`,
    `time_limit_min: ${timeLimit}`,
    `today_goal: ${goal}`,
    `apply_strategy: ${options.applyStrategy}`,
    'locale: ja-JP',
    `timezone: ${timezone}`,
    '<</TODAY_MENU_REQUEST>>',
    '',
    '<<USER_PROFILE>>',
    profileBlock || '(none)',
    '<</USER_PROFILE>>',
    '',
    '<<RECENT_TRAINING_SUMMARY>>',
    recentSummary,
    '<</RECENT_TRAINING_SUMMARY>>',
  ].join('\n');
}

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

export function parseAiTodayMenuFromText(text: string): AiTodayMenu {
  const raw = text.trim();
  const tryParse = (value: string) => JSON.parse(value) as unknown;

  let parsed: unknown;
  try {
    parsed = tryParse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < 0 || end <= start) {
      throw new Error('AI response is not JSON');
    }
    parsed = tryParse(raw.slice(start, end + 1));
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid menu object');
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error('Unsupported menu version');
  }

  const items = obj.items;
  if (!Array.isArray(items)) {
    throw new Error('Missing items');
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item');
    }
    const itemObj = item as Record<string, unknown>;
    if (typeof itemObj.exerciseName !== 'string' || itemObj.exerciseName.trim().length === 0) {
      throw new Error('Invalid exerciseName');
    }
    const sets = itemObj.sets;
    if (!Array.isArray(sets) || sets.length === 0) {
      throw new Error('Invalid sets');
    }
    for (const set of sets) {
      if (!set || typeof set !== 'object') {
        throw new Error('Invalid set');
      }
      const reps = coerceFiniteNumber((set as Record<string, unknown>).reps);
      if (reps === null || !Number.isInteger(reps) || reps <= 0) {
        throw new Error('Invalid reps');
      }
      const weight = (set as Record<string, unknown>).weight;
      if (weight !== null && coerceFiniteNumber(weight) === null) {
        throw new Error('Invalid weight');
      }
    }
  }

  const title = typeof obj.title === 'string' ? obj.title : '';
  const warnings = Array.isArray(obj.warnings) ? obj.warnings.filter((v): v is string => typeof v === 'string') : [];
  const rationale = Array.isArray(obj.rationale) ? obj.rationale.filter((v): v is string => typeof v === 'string') : [];
  const cooldown = Array.isArray(obj.cooldown) ? obj.cooldown.filter((v): v is string => typeof v === 'string') : [];

  return {
    version: 1,
    title,
    warnings,
    rationale,
    items: items as AiTodayMenu['items'],
    cooldown,
  };
}

export async function requestAiTodayMenu(date: string, options: TodayMenuRequestOptions): Promise<AiTodayMenu> {
  const profile = await getUserProfile();
  const profileBlock = profile ? formatUserProfileForPrompt(profile) : '';
  const recentSummary = await buildRecentTrainingSummary(date, options.selectedBodyPart);
  const text = buildTodayMenuText(date, options, profileBlock, recentSummary);

  const payload = buildAiChatRequest(text, undefined, {
    systemExtra: TODAY_MENU_SYSTEM_EXTRA,
    outputFormat: 'json',
  });

  const response = await fetch(AI_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed: ${response.status} ${errorBody}`);
  }

  const raw = await response.text();
  const data = raw ? (JSON.parse(raw) as { text?: string }) : {};
  const reply = data.text?.trim();
  if (!reply) {
    throw new Error('Empty response');
  }

  return parseAiTodayMenuFromText(reply);
}

function joinMemoParts(...parts: (string | null | undefined)[]): string | null {
  const normalized = parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p.length > 0);
  if (normalized.length === 0) {
    return null;
  }
  return normalized.join(' / ');
}

function buildSetMetaMemo(set: AiTodayMenu['items'][number]['sets'][number]): string | null {
  const pieces: string[] = [];
  const rpe = coerceFiniteNumber(set.rpe);
  const rest = coerceFiniteNumber(set.restSec);
  if (rpe !== null) {
    pieces.push(`RPE${rpe}`);
  }
  if (rest !== null) {
    pieces.push(`rest${rest}s`);
  }
  return pieces.length ? pieces.join(' ') : null;
}

export async function applyAiTodayMenuToSession(
  sessionId: string,
  menu: AiTodayMenu,
): Promise<void> {
  for (const item of menu.items) {
    const bodyPart = typeof item.bodyPart === 'string' ? item.bodyPart : null;
    const exerciseName = item.exerciseName.trim();
    if (!exerciseName) {
      continue;
    }

    const exercise = await createExerciseAndAddToToday(sessionId, exerciseName, bodyPart);
    const lastSet = await getLastSetByExercise(exercise.id);

    for (const set of item.sets) {
      const reps = coerceFiniteNumber(set.reps);
      if (reps === null || !Number.isInteger(reps) || reps <= 0) {
        continue;
      }

      const weight = set.weight === null ? (lastSet?.weight ?? 0) : (coerceFiniteNumber(set.weight) ?? 0);
      const memo = joinMemoParts(set.memo ?? null, buildSetMetaMemo(set), item.note ?? null);
      await addSet(sessionId, exercise.id, weight, reps, memo);
    }
  }
}
