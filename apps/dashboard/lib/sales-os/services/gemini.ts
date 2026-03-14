import { apiClient } from '@/lib/api-client';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  _imageParts?: { inlineData: { data: string; mimeType: string } }[],
  _useSearch = false,
) {
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  const response = await apiClient.post<{ content: string }>('/ai/complete', {
    messages,
    systemPrompt: systemInstruction,
  });
  return response.content || 'No response generated.';
}

export async function generateChatReply(
  history: { role: string; text: string }[],
  newMessage: string,
  persona: string,
) {
  const context = history.map((h) => `${h.role}: ${h.text}`).join('\n');
  const prompt = `Roleplay Context: Você é ${persona}.\nHistórico da conversa:\n${context}\nO usuário (Vendedor) disse: "${newMessage}".\nResponda como a persona. Seja curto (máx 3 frases). Mantenha a personagem difícil.`;

  const response = await apiClient.post<{ content: string }>('/ai/complete', {
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content || '...';
}

export async function generateImage(_prompt: string) {
  return null;
}

export async function generateSpeech(_text: string): Promise<ArrayBuffer | null> {
  return null;
}

export async function playAudioBuffer(buffer: ArrayBuffer) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(buffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}
