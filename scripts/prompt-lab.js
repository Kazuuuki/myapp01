#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function readAiConfig() {
  const configPath = path.join(process.cwd(), 'constants', 'ai-config.ts');
  const raw = fs.readFileSync(configPath, 'utf8');

  const baseUrlMatch = raw.match(/AI_API_BASE_URL\s*=\s*'([^']+)'/);
  if (!baseUrlMatch) {
    throw new Error('Failed to parse AI_API_BASE_URL from constants/ai-config.ts');
  }
  const baseUrl = baseUrlMatch[1];

  const systemMatch = raw.match(/AI_CHAT_SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`;/);
  if (!systemMatch) {
    throw new Error('Failed to parse AI_CHAT_SYSTEM_PROMPT from constants/ai-config.ts');
  }
  const systemPrompt = systemMatch[1];

  return {
    endpoint: `${baseUrl}/ai/chat`,
    systemPrompt,
  };
}

function buildSystemPrompt(base, extra) {
  const normalized = typeof extra === 'string' ? extra.trim() : '';
  if (!normalized) return base;
  return `${base}\n\n${normalized}`;
}

function buildRequestText(userText, profileBlock) {
  if (!profileBlock) return userText;
  return [
    '<<USER_PROFILE>>',
    profileBlock,
    '<</USER_PROFILE>>',
    '',
    '<<USER_MESSAGE>>',
    userText,
    '<</USER_MESSAGE>>',
    '',
    'プロフィールを踏まえて回答してください。プロフィールに無い情報（例: 身長/体重など）は推測せず、必要なら質問してください。',
  ].join('\n');
}

function defaultProfile() {
  return [
    '# Profile',
    'goal: 筋肥大（脚は控えめ）',
    'frequency_per_week: 3',
    'session_duration_min: 45',
    'equipment: ダンベルのみ（可変式）',
    'injury_or_pain: 右肩が痛い（オーバーヘッド不可）',
    'experience_level: beginner',
    'age: 30',
    'sex: prefer_not_to_say',
    'height_cm: 170',
    'weight_kg: 65',
  ].join('\n');
}

function defaultQuestion() {
  return '今日45分でできるメニューを、肩の痛みに配慮して提案して。脚は軽めで。';
}

async function sendOnce({ endpoint, baseSystemPrompt, mode, profile, question }) {
  const requestId = `lab_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const systemExtra = mode === 'system' || mode === 'both' ? profile : undefined;
  const system = buildSystemPrompt(baseSystemPrompt, systemExtra);

  const text =
    mode === 'text' || mode === 'both'
      ? buildRequestText(question, profile)
      : question;

  const payload = {
    text,
    system,
    outputFormat: 'markdown',
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-request-id': requestId,
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.details = raw;
    throw error;
  }
  const data = raw ? JSON.parse(raw) : {};
  return {
    requestId,
    payload,
    reply: (data && data.text ? String(data.text) : '').trim(),
    raw,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modeArg = (args.mode || 'all').toLowerCase();
  const { endpoint, systemPrompt } = readAiConfig();

  const profile =
    args['profile-file']
      ? fs.readFileSync(path.resolve(args['profile-file']), 'utf8').trim()
      : (args.profile ? String(args.profile) : defaultProfile());
  const question = args.question ? String(args.question) : defaultQuestion();

  const modes =
    modeArg === 'all'
      ? ['none', 'system', 'text', 'both']
      : [modeArg];

  console.log('Endpoint:', endpoint);
  console.log('Modes:', modes.join(', '));
  console.log('Question:', question);
  console.log('');

  for (const mode of modes) {
    if (!['none', 'system', 'text', 'both'].includes(mode)) {
      throw new Error(`Invalid --mode: ${mode} (use none|system|text|both|all)`);
    }
    console.log(`=== mode: ${mode} ===`);
    const startedAt = Date.now();
    try {
      const result = await sendOnce({
        endpoint,
        baseSystemPrompt: systemPrompt,
        mode,
        profile,
        question,
      });
      const ms = Date.now() - startedAt;
      console.log('requestId:', result.requestId);
      console.log('reply:');
      console.log(result.reply || '(empty)');
      console.log(`(took ${ms}ms)`);
    } catch (err) {
      console.log('error:', err && err.message ? err.message : String(err));
      if (err && err.details) {
        console.log('details:');
        console.log(String(err.details));
      }
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

