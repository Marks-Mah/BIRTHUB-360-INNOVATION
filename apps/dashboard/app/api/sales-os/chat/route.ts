import { NextRequest } from "next/server";

type Payload = {
  message?: string;
  moduleName?: string;
  history?: { role: "user" | "model"; text: string }[];
};

function buildFallbackText(moduleName: string, message: string) {
  return `Como mentor de ${moduleName}, recomendo: ${message}. Priorize próximos passos claros, confirme dor de negócio e feche um compromisso de data no fim da call.`;
}

async function generateMentorText(moduleName: string, message: string, history: Payload["history"]) {
  const context = (history ?? [])
    .slice(-10)
    .map((item) => `${item.role === "user" ? "Vendedor" : "Mentor"}: ${item.text}`)
    .join("\n");

  const prompt = [
    `Você é Mentor ${moduleName}.`,
    "Responda em português-BR.",
    "Seja prático, com no máximo 5 frases curtas.",
    "Histórico:",
    context || "(sem histórico)",
    `Mensagem atual: ${message}`,
  ].join("\n");

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      cache: 'no-store',
    });

    if (!response.ok) return buildFallbackText(moduleName, message);

    const payload = (await response.json()) as { content?: string };
    return payload.content || buildFallbackText(moduleName, message);
  } catch {
    return buildFallbackText(moduleName, message);
  }
}

export async function POST(request: NextRequest) {
  const { message, moduleName, history } = (await request.json()) as Payload;
  const userMessage = (message || "continue").trim();
  const mentorModule = (moduleName || "vendas").trim();

  const text = await generateMentorText(mentorModule, userMessage, history);
  const encoder = new TextEncoder();
  const chunks = text.split(/\s+/).filter(Boolean);

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of chunks) {
        controller.enqueue(encoder.encode(`data: ${word}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
