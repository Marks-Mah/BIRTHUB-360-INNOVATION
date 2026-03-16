import { postJson } from "./http";
export class GeminiClient {
    apiKey;
    model;
    baseUrl;
    constructor(apiKey, model = "gemini-1.5-pro", baseUrl = "https://generativelanguage.googleapis.com/v1beta") {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }
    async chat(messages, options) {
        const geminiMessages = messages.map((m) => ({
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
        const response = await postJson(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, payload);
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
    async *stream(messages, options) {
        // Streaming not supported via simple postJson (which awaits full body).
        // Would need fetch with reader.
        throw new Error("Streaming not implemented in GeminiClient");
    }
}
export class OpenAIClient {
    apiKey;
    model;
    baseUrl;
    constructor(apiKey, model = "gpt-4o", baseUrl = "https://api.openai.com/v1") {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }
    async chat(messages, options) {
        const payload = {
            model: this.model,
            messages: messages,
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
            top_p: options?.topP,
            stop: options?.stop,
        };
        const response = await postJson(`${this.baseUrl}/chat/completions`, payload, {
            headers: { Authorization: `Bearer ${this.apiKey}` },
        });
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
    async *stream(messages, options) {
        throw new Error("Streaming not implemented in OpenAIClient");
    }
}
export class AnthropicClient {
    apiKey;
    model;
    baseUrl;
    constructor(apiKey, model = "claude-3-opus-20240229", baseUrl = "https://api.anthropic.com/v1") {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }
    async chat(messages, options) {
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
        const response = await postJson(`${this.baseUrl}/messages`, payload, {
            headers: {
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01",
            },
        });
        return {
            content: response.content[0]?.text ?? "",
            model: this.model,
            usage: {
                promptTokens: response.usage.input_tokens,
                completionTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
        };
    }
    async *stream(messages, options) {
        throw new Error("Streaming not implemented in AnthropicClient");
    }
}
