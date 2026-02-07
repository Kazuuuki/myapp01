import { AI_TODAY_MENU_ENDPOINT, buildAiChatRequest } from '@/constants/ai-config';
import { formatUserProfileForPrompt, getUserProfile } from '@/src/usecases/userProfile';
import { createAiLog } from '@/src/repo/aiLogRepo';
import { getRecentSessions, getExercisesBySession } from '@/src/repo/workoutRepo';
import { createExerciseAndAddToToday } from '@/src/usecases/today';
import { addSet, getLastSetByExercise, getSetsBySession, getSetsBySessionAndExercise } from '@/src/repo/setRepo';

export type TodayMenuRequestOptions = {
  selectedBodyPart: string;
  timeLimitMin?: number;
  todayGoal?: string;
  applyStrategy: 'append' | 'replace';
  includeWeightSuggestions?: boolean;
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
あなたはトレーニングメニュー作成アシスタントです。安全を最優先してください（無理な高重量、痛みを我慢する提案はしない）。医療行為ではない旨を必ず warnings に含めてください。

出力は必ずJSONのみ（先頭と末尾が { }）で、追加の文章・コードフェンス・Markdownは一切出力しないでください。

次のJSONスキーマに厳密に従ってください（キー名を変えない）:
- version: number (1)
- title: string
- warnings: string[]
- rationale: string[]
- items: { bodyPart: string, exerciseName: string, sets: { reps: number, weight: number|null, rpe?: number, restSec?: number, memo?: string|null }[], note?: string|null }[]
- cooldown: string[]

制約:
- reps は必ず整数（例 8, 10, 12）。範囲表現は禁止。
- weight は kg の数値 or null。<<TODAY_MENU_REQUEST>> の include_weight_suggestions が true の場合のみ数値を入れてよい（それ以外は null）。
- weight を数値で入れる場合は、<<RECENT_TRAINING_SUMMARY>> の実績（kg×回数）を根拠にし、無理のない安全側の提案にする（不明なら null）。
- 痛み/違和感の情報がある場合、安全を優先し回避・代替・ボリューム調整を行う。
- 医療行為ではない旨を warnings に必ず含める。
`.trim();

const TODAY_MENU_JSON_REPAIR_SYSTEM = `
あなたはJSON整形アシスタントです。出力は必ずJSONのみ（先頭と末尾が { }）で、追加の文章・コードフェンス・Markdownは一切出力しないでください。

次のJSONスキーマに厳密に従ってください（キー名を変えない）:
- version: number (1)
- title: string
- warnings: string[]
- rationale: string[]
- items: { bodyPart: string, exerciseName: string, sets: { reps: number, weight: number|null, rpe?: number, restSec?: number, memo?: string|null }[], note?: string|null }[]
- cooldown: string[]

制約:
- reps は必ず整数。範囲表現は禁止。
- weight は不明なら null。

必須:
- version は必ず 1 にしてください。
- items 配列を必ず作り、exerciseName と sets を必ず含めてください。
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

function formatWeightKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatSet(weightKg: number, reps: number): string {
  return `${formatWeightKg(weightKg)}x${reps}`;
}

export async function buildRecentTrainingSummary(todayDate: string, selectedBodyPart: string): Promise<string> {
  const sessions = await getRecentSessions(12);
  const recent = sessions.filter((session) => session.date < todayDate).slice(0, 5);

  if (recent.length === 0) {
    return [
      'weight_unit: kg',
      'recent_sessions:',
      '(none)',
      '',
      'last_done_for_selected_part: unknown',
      'note: 履歴が少ない場合は初心者向け・安全寄りに提案してください',
    ].join('\n');
  }

  const lines: string[] = ['weight_unit: kg', 'recent_sessions:'];
  let lastDoneForPart: string | null = null;
  let lastDoneForPartSessionId: string | null = null;

  for (const session of recent) {
    const items = await getExercisesBySession(session.id);
    const sets = await getSetsBySession(session.id);
    const lastSetByExerciseId = new Map<string, { weight: number; reps: number }>();
    for (const set of sets) {
      lastSetByExerciseId.set(set.exerciseId, { weight: set.weight, reps: set.reps });
    }

    const names = items
      .slice(0, 6)
      .map((item) => {
        const last = lastSetByExerciseId.get(item.exercise.id);
        if (!last) {
          return item.exercise.name;
        }
        return `${item.exercise.name} (${formatSet(last.weight, last.reps)})`;
      });

    lines.push(`- ${session.date}: ${names.join(', ')}`);
    if (!lastDoneForPart) {
      const didHitPart = items.some((item) => (item.exercise.bodyPart ?? null) === selectedBodyPart);
      if (didHitPart) {
        lastDoneForPart = session.date;
        lastDoneForPartSessionId = session.id;
      }
    }
  }

  lines.push('');
  lines.push(`last_done_for_selected_part: ${lastDoneForPart ?? 'unknown'}`);

  if (lastDoneForPartSessionId) {
    const items = await getExercisesBySession(lastDoneForPartSessionId);
    const partExercises = items
      .filter((item) => (item.exercise.bodyPart ?? null) === selectedBodyPart)
      .slice(0, 3);
    if (partExercises.length > 0) {
      lines.push('');
      lines.push('selected_part_recent_sets:');
      for (const item of partExercises) {
        const exerciseSets = await getSetsBySessionAndExercise(lastDoneForPartSessionId, item.exercise.id);
        const lastThree = exerciseSets.slice(-3);
        const formatted = lastThree.map((set) => formatSet(set.weight, set.reps)).join(', ');
        lines.push(`- ${item.exercise.name}: ${formatted || '(none)'}`);
      }
    }
  }

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
  const includeWeight = options.includeWeightSuggestions ? 'true' : 'false';

  return [
    '<<TODAY_MENU_REQUEST>>',
    `date: ${date}`,
    `selected_body_part: ${options.selectedBodyPart}`,
    `time_limit_min: ${timeLimit}`,
    `today_goal: ${goal}`,
    `apply_strategy: ${options.applyStrategy}`,
    `include_weight_suggestions: ${includeWeight}`,
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

function parseJsonObjectFromText(text: string): unknown {
  const raw = text.trim();
  const tryParse = (value: string) => JSON.parse(value) as unknown;
  try {
    return tryParse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < 0 || end <= start) {
      throw new Error('AI response is not JSON');
    }
    return tryParse(raw.slice(start, end + 1));
  }
}

function extractFirstPositiveInt(value: unknown): number | null {
  const n = coerceFiniteNumber(value);
  if (n !== null) {
    const i = Math.round(n);
    return Number.isFinite(i) && i > 0 ? i : null;
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function ensureMedicalDisclaimer(warnings: string[]): string[] {
  const has = warnings.some((w) => w.includes('医療') || w.includes('診断'));
  if (has) return warnings;
  return [...warnings, '医療行為ではありません。痛みや違和感がある場合は中止し必要に応じて医療機関へ相談してください。'];
}

function validateMenuShape(menu: AiTodayMenu): void {
  if (menu.version !== 1) throw new Error('Unsupported menu version');
  if (!Array.isArray(menu.items) || menu.items.length === 0) throw new Error('Missing items');
  for (const item of menu.items) {
    if (typeof item.exerciseName !== 'string' || item.exerciseName.trim().length === 0) throw new Error('Invalid exerciseName');
    if (!Array.isArray(item.sets) || item.sets.length === 0) throw new Error('Invalid sets');
    for (const set of item.sets) {
      const reps = extractFirstPositiveInt(set.reps);
      if (reps === null) throw new Error('Invalid reps');
      if (set.weight !== null && coerceFiniteNumber(set.weight) === null) throw new Error('Invalid weight');
    }
  }
}

function normalizeToAiTodayMenu(parsed: unknown, selectedBodyPart: string): AiTodayMenu {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid menu object');
  }

  const obj = parsed as Record<string, unknown>;

  // Preferred schema
  if (Array.isArray(obj.items)) {
    const title = typeof obj.title === 'string' ? obj.title : '';
    const warnings = Array.isArray(obj.warnings) ? obj.warnings.filter((v): v is string => typeof v === 'string') : [];
    const rationale = Array.isArray(obj.rationale) ? obj.rationale.filter((v): v is string => typeof v === 'string') : [];
    const cooldown = Array.isArray(obj.cooldown) ? obj.cooldown.filter((v): v is string => typeof v === 'string') : [];
    const version = obj.version === 1 ? 1 : 1;
    const menu: AiTodayMenu = {
      version,
      title,
      warnings: ensureMedicalDisclaimer(warnings),
      rationale,
      items: obj.items as AiTodayMenu['items'],
      cooldown,
    };
    validateMenuShape(menu);
    return menu;
  }

  // Repair schema variant: { exercises: [{ name, sets, reps, unit, notes }] }
  if (Array.isArray(obj.exercises)) {
    const exercises = obj.exercises as unknown[];
    const items: AiTodayMenu['items'] = [];
    for (const ex of exercises) {
      if (!ex || typeof ex !== 'object') continue;
      const exObj = ex as Record<string, unknown>;
      const name = typeof exObj.name === 'string' ? exObj.name.trim() : '';
      if (!name) continue;
      const setsCount = extractFirstPositiveInt(exObj.sets) ?? 1;
      const reps = extractFirstPositiveInt(exObj.reps) ?? 10;
      const unit = typeof exObj.unit === 'string' ? exObj.unit.trim() : '';
      const notes = typeof exObj.notes === 'string' ? exObj.notes.trim() : '';

      const memoBase = unit ? `unit:${unit}` : null;
      const memo = notes ? joinMemoParts(memoBase, notes) : memoBase;
      const sets = Array.from({ length: setsCount }, () => ({ reps, weight: null as null, memo }));

      items.push({
        bodyPart: selectedBodyPart,
        exerciseName: name,
        sets,
        note: null,
      });
    }

    const menu: AiTodayMenu = {
      version: 1,
      title: typeof obj.title === 'string' ? obj.title : `AI提案: ${selectedBodyPart}`,
      warnings: ensureMedicalDisclaimer([]),
      rationale: [],
      items,
      cooldown: [],
    };
    validateMenuShape(menu);
    return menu;
  }

  throw new Error('Unsupported menu schema');
}

async function requestAiText(payload: ReturnType<typeof buildAiChatRequest>): Promise<string> {
  const response = await fetch(AI_TODAY_MENU_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed: ${response.status} ${errorBody}`);
  }

  const raw = await response.text();
  const data = raw ? (JSON.parse(raw) as { text?: string; menu?: unknown }) : {};
  if (data.menu) {
    return JSON.stringify(data.menu);
  }
  const reply = data.text?.trim();
  if (!reply) {
    throw new Error('Empty response');
  }
  return reply;
}

function buildReplySnippet(text: string, maxLen = 400): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}

export async function requestAiTodayMenu(date: string, options: TodayMenuRequestOptions): Promise<AiTodayMenu> {
  const profile = await getUserProfile();
  const profileBlock = profile ? formatUserProfileForPrompt(profile) : '';
  const recentSummary = await buildRecentTrainingSummary(date, options.selectedBodyPart);
  const text = buildTodayMenuText(date, options, profileBlock, recentSummary);

  const payload = buildAiChatRequest(text, undefined, {
    systemOverride: TODAY_MENU_SYSTEM_EXTRA,
    outputFormat: 'json',
  });

  if (__DEV__) {
    console.log('[ai/today-menu] request', { date, options, payload });
  }

  let replyText: string | null = null;

  try {
    const reply = await requestAiText(payload);
    replyText = reply;

    let menu: AiTodayMenu;
    try {
      menu = normalizeToAiTodayMenu(parseJsonObjectFromText(reply), options.selectedBodyPart);
    } catch {
      if (__DEV__) {
        console.warn('[ai/today-menu] non-json reply; attempting repair', { snippet: buildReplySnippet(reply) });
      }

      const repairText = [
        '<<JSON_REPAIR_REQUEST>>',
        '以下の内容を、指定スキーマのJSONに変換してください。JSON以外は出力しないでください。',
        '<</JSON_REPAIR_REQUEST>>',
        '',
        '<<ORIGINAL_REQUEST>>',
        text,
        '<</ORIGINAL_REQUEST>>',
        '',
        '<<RAW_MODEL_OUTPUT>>',
        reply,
        '<</RAW_MODEL_OUTPUT>>',
      ].join('\n');

      const repairPayload = buildAiChatRequest(repairText, undefined, {
        systemOverride: TODAY_MENU_JSON_REPAIR_SYSTEM,
        outputFormat: 'json',
      });

      const repairedReply = await requestAiText(repairPayload);
      replyText = repairedReply;
      menu = normalizeToAiTodayMenu(parseJsonObjectFromText(repairedReply), options.selectedBodyPart);
    }

    if (__DEV__) {
      console.log('[ai/today-menu] response', { title: menu.title, items: menu.items.length, warnings: menu.warnings.length });
    }

    await createAiLog({
      kind: 'today_menu',
      date,
      requestText: text,
      responseText: replyText,
      parsedJson: JSON.stringify(menu),
      error: null,
      createdAt: new Date().toISOString(),
    });

    return menu;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn('[ai/today-menu] failed', { message, replySnippet: replyText ? buildReplySnippet(replyText) : null });
    }
    await createAiLog({
      kind: 'today_menu',
      date,
      requestText: text,
      responseText: replyText,
      parsedJson: null,
      error: message,
      createdAt: new Date().toISOString(),
    }).catch(() => undefined);
    throw e;
  }
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
  options?: { weightStrategy?: 'last' | 'ai_or_last' },
): Promise<void> {
  const weightStrategy = options?.weightStrategy ?? 'ai_or_last';
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

      const weightFromAi = set.weight === null ? null : (coerceFiniteNumber(set.weight) ?? null);
      const weight =
        weightStrategy === 'last'
          ? (lastSet?.weight ?? 0)
          : (weightFromAi ?? lastSet?.weight ?? 0);
      const memo = joinMemoParts(set.memo ?? null, buildSetMetaMemo(set), item.note ?? null);
      await addSet(sessionId, exercise.id, weight, reps, memo);
    }
  }
}
