export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
export type CompletionOptions = { temperature?: number; maxTokens?: number; topP?: number; stop?: string[] };
export type CompletionResponse = {
  content: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'fallback';
};

type Provider = { name: 'openai' | 'anthropic' | 'gemini'; apiKey?: string; model: string };

export class LLMClient {
  private providers: Provider[];

  constructor() {
    this.providers = [
      { name: 'openai', apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
      { name: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest' },
      { name: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' },
    ];
  }

  async chat(messages: Message[], _options?: CompletionOptions): Promise<CompletionResponse> {
    const latest = messages[messages.length - 1]?.content ?? '';
    for (const provider of this.providers) {
      if (!provider.apiKey) continue;
      try {
        const content = await this.callProvider(provider, messages, _options);
        return { content, model: provider.model, provider: provider.name };
      } catch {
        continue;
      }
    }

    return { content: latest, model: 'fallback-local', provider: 'fallback' };
  }

  private async callProvider(provider: Provider, messages: Message[], options?: CompletionOptions): Promise<string> {
    if (provider.name === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          stop: options?.stop,
        }),
      });
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      if (!response.ok) throw new Error('openai_failed');
      return payload.choices?.[0]?.message?.content ?? '';
    }

    if (provider.name === 'anthropic') {
      const system = messages.find((message) => message.role === 'system')?.content;
      const otherMessages = messages.filter((message) => message.role !== 'system');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: provider.model,
          system,
          messages: otherMessages.map((message) => ({ role: message.role, content: message.content })),
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature,
          top_p: options?.topP,
          stop_sequences: options?.stop,
        }),
      });
      const payload = await response.json() as { content?: Array<{ text?: string }> };
      if (!response.ok) throw new Error('anthropic_failed');
      return payload.content?.[0]?.text ?? '';
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          stopSequences: options?.stop,
        },
      }),
    });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    if (!response.ok) throw new Error('gemini_failed');
    return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}
