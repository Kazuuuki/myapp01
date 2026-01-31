export const AI_API_BASE_URL = 'https://j81fg03kb7.execute-api.ap-northeast-1.amazonaws.com';
export const AI_CHAT_ENDPOINT = `${AI_API_BASE_URL}/ai/chat`;

export type AiChatRequest = {
  text: string;
  history?: AiChatHistoryItem[];
};

export type AiChatResponse = {
  text: string;
};

export type AiChatHistoryItem = {
  role: 'user' | 'bot';
  text: string;
};

export function buildAiChatRequest(text: string, history?: AiChatHistoryItem[]): AiChatRequest {
  if (history && history.length > 0) {
    return { text, history };
  }
  return { text };
}
