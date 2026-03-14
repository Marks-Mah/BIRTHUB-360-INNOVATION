import { GeminiClient } from "../src/index";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Skipping Gemini test: GEMINI_API_KEY not found.");
    return;
  }

  console.log("Testing Gemini Client...");
  const client = new GeminiClient(apiKey);
  try {
    const response = await client.generateContent("Hello, are you working?");
    console.log("Response:", response);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
