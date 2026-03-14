import { describe, it, expect, vi } from 'vitest';
import { generateText } from '../gemini';

// Mock the global fetch for server API testing
global.fetch = vi.fn();

// Mock GoogleGenAI to avoid actual API calls during test
vi.mock('@google/genai', () => {
  const GoogleGenAI = vi.fn();
  GoogleGenAI.prototype.models = {
    generateContent: vi.fn().mockResolvedValue({
      text: () => "Mocked Gemini Response",
      candidates: [{ content: { parts: [{ text: "Mocked Gemini Response" }] } }]
    })
  };
  return {
    GoogleGenAI,
    Modality: { AUDIO: 'AUDIO' }
  };
});

describe('Gemini Service', () => {
  it('should call Gemini Client when USE_SERVER_API is false', async () => {
    process.env.NEXT_PUBLIC_USE_SERVER_API = 'false';
    const response = await generateText("Test Prompt");
    expect(response).toBe("Mocked Gemini Response");
  });

  it('should call Server API when USE_SERVER_API is true', async () => {
    process.env.NEXT_PUBLIC_USE_SERVER_API = 'true';
    (global.fetch as any).mockResolvedValue({
        json: async () => ({ text: "Server Response" })
    });

    const response = await generateText("Test Prompt");
    expect(response).toBe("Server Response");
    expect(global.fetch).toHaveBeenCalledWith('/api/sales/generate', expect.any(Object));
  });

  it('should handle API errors gracefully', async () => {
    process.env.NEXT_PUBLIC_USE_SERVER_API = 'true';
    (global.fetch as any).mockRejectedValue(new Error("API Failed"));

    const response = await generateText("Test Prompt");
    expect(response).toBe("Error calling server API.");
  });
});
