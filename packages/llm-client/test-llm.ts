import { GeminiClient } from './src/index';

async function main() {
  console.log('Testing LLM Client instantiation...');
  try {
    const client = new GeminiClient();
    console.log('GeminiClient instantiated successfully.');

    if (!process.env.GEMINI_API_KEY) {
      console.log('Skipping LLM generation test: GEMINI_API_KEY not found');
      return;
    }

    try {
        const response = await client.generateContent('Hello, are you working?');
        console.log('Gemini Response:', response);
    } catch (e: any) {
        console.error('Gemini API call failed:', e.message);
    }
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

main();
