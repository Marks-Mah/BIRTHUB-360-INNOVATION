import type { NextApiRequest, NextApiResponse } from "next";
import { requireApiAuth } from "../_utils/auth";

type Body = { prompt?: string; context?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  try {
    await requireApiAuth(req);
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { prompt, context } = (req.body || {}) as Body;
  if (!prompt) return res.status(400).json({ error: "prompt_required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "missing_gemini_api_key" });

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: context ? `${context}\n\n${prompt}` : prompt }] }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return res.status(response.status).json({ error: "gemini_request_failed", detail });
  }

  const payload = await response.json() as any;
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return res.status(200).json({ content: text });
}
