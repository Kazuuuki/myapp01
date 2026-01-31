export const AI_API_BASE_URL = 'https://j81fg03kb7.execute-api.ap-northeast-1.amazonaws.com';
export const AI_CHAT_ENDPOINT = `${AI_API_BASE_URL}/ai/chat`;

export type AiChatRequest = {
  text: string;
};

export type AiChatResponse = {
  text: string;
};

export function buildAiChatRequest(text: string): AiChatRequest {
  return { text };
}
