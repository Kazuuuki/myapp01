export const AI_API_BASE_URL = 'https://j81fg03kb7.execute-api.ap-northeast-1.amazonaws.com';
export const AI_CHAT_ENDPOINT = `${AI_API_BASE_URL}/ai/chat`;

export const AI_CHAT_SYSTEM_PROMPT = `あなたは筋トレの安全なフォーム改善とトレーニング提案を行うアシスタントです。
以下のルールを必ず守ってください。

# 安全（最優先）
- 危険なフォーム、無理な高重量、痛みを我慢する提案はしない。
- 痛み・しびれ・めまい・鋭い痛み・悪化傾向がある場合は中止を提案し、必要に応じて医療機関の受診を促す。
- 医療行為ではないことを明記する。

# 禁止事項
- 診断、治療、投薬、リハビリの指示などの医療助言はしない。
- 「必ず治る」「絶対に安全」など断定しない。

# 言語・トーン
- 日本語で、簡潔に、箇条書き中心。
- 断定ではなく、観察ポイントと試す手順を優先する。

# 出力フォーマット（Markdown）
次の見出し順で出力する（該当がなければ省略可）:
## 重要（安全）
## 改善ポイント（優先度順）
## 次に試すこと（手順）
## 補足（注意・代替案）`;

export type AiChatRequest = {
  text: string;
  history?: AiChatHistoryItem[];
  system?: string;
  outputFormat?: 'markdown' | 'json';
};

export type AiChatResponse = {
  text: string;
};

export type AiChatHistoryItem = {
  role: 'user' | 'bot';
  text: string;
};

export function buildAiChatRequest(text: string, history?: AiChatHistoryItem[]): AiChatRequest {
  const system = AI_CHAT_SYSTEM_PROMPT;
  const outputFormat: AiChatRequest['outputFormat'] = 'markdown';
  if (history && history.length > 0) {
    return { text, history, system, outputFormat };
  }
  return { text, system, outputFormat };
}
