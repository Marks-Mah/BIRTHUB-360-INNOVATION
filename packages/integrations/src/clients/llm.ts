import { postJson } from "./http";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
}

export interface CompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface ILLMClient {
  chat(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse>;
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<string, void, unknown>;
}

// ─── GEMINI IMPLEMENTATION ───────────────────────────────────────────────────

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export class GeminiClient implements ILLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-1.5-pro",
    private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta",
  ) {}

  async chat(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse> {
    const geminiMessages: GeminiContent[] = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user", // Gemini doesn't support 'system' directly in messages list usually, but let's map simply.
      // Note: System instructions are separate in newer API versions, but for simple chat, user/model is enough.
      // If role is system, we might need to prepend to first user message or use systemInstruction.
      parts: [{ text: m.content }],
    }));

    // Handle system message by prepending to first user message if needed, or ignoring role mapping issues.
    // Simplifying: treat system as user for now or just filter out if strictly enforced.

    const payload = {
      contents: geminiMessages,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        topP: options?.topP,
        stopSequences: options?.stop,
      },
    };

    const response = await postJson<GeminiGenerateResponse>(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      payload,
    );

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return {
      content: text,
      model: this.model,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<string, void, unknown> {
    // Streaming not supported via simple postJson (which awaits full body).
    // Would need fetch with reader.
    throw new Error("Streaming not implemented in GeminiClient");
  }
}

// ─── OPENAI IMPLEMENTATION ───────────────────────────────────────────────────

interface OpenAICompletionResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient implements ILLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gpt-4o",
    private readonly baseUrl = "https://api.openai.com/v1",
  ) {}

  async chat(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse> {
    const payload = {
      model: this.model,
      messages: messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      stop: options?.stop,
    };

    const response = await postJson<OpenAICompletionResponse>(
      `${this.baseUrl}/chat/completions`,
      payload,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );

    return {
      content: response.choices[0]?.message?.content ?? "",
      model: this.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<string, void, unknown> {
    throw new Error("Streaming not implemented in OpenAIClient");
  }
}

// ─── ANTHROPIC IMPLEMENTATION ────────────────────────────────────────────────

interface AnthropicCompletionResponse {
  content: Array<{ text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicClient implements ILLMClient {
  constructor(
    private readonly apiKey: string,
    private readonly model = "claude-3-opus-20240229",
    private readonly baseUrl = "https://api.anthropic.com/v1",
  ) {}

  async chat(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse> {
    // Anthropic requires top-level system parameter
    const systemMessage = messages.find((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");

    const payload = {
      model: this.model,
      messages: otherMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      system: systemMessage?.content,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature,
      top_p: options?.topP,
      stop_sequences: options?.stop,
    };

    const response = await postJson<AnthropicCompletionResponse>(
      `${this.baseUrl}/messages`,
      payload,
      {
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
    );

    return {
      content: response.content[0]?.text ?? "",
      model: this.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncGenerator<string, void, unknown> {
    throw new Error("Streaming not implemented in AnthropicClient");
  }
}
