export type LeadQualificationResult = {
  icpScore: number;
  icpTier: 'T1' | 'T2' | 'T3';
  reasoning: string;
};

export type CadenceStep = {
  day: number;
  channel: 'email' | 'linkedin' | 'call';
  subject: string;
  body: string;
};

function extractJsonBlock(input: string): string {
  const fenced = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return input.trim();
}

export function parseQualificationResponse(input: string): LeadQualificationResult {
  const raw = extractJsonBlock(input);

  let parsed: Partial<LeadQualificationResult> = {};
  try {
    parsed = JSON.parse(raw) as Partial<LeadQualificationResult>;
  } catch {
    return { icpScore: 50, icpTier: 'T2', reasoning: input.slice(0, 500) || 'Unable to parse model response.' };
  }

  const normalizedScore = Math.max(0, Math.min(100, Number(parsed.icpScore ?? 50) || 50));
  const normalizedTier = parsed.icpTier === 'T1' || parsed.icpTier === 'T2' || parsed.icpTier === 'T3'
    ? parsed.icpTier
    : normalizedScore >= 80
      ? 'T1'
      : normalizedScore >= 60
        ? 'T2'
        : 'T3';

  return {
    icpScore: normalizedScore,
    icpTier: normalizedTier,
    reasoning: (parsed.reasoning || 'No reasoning provided.').slice(0, 1000),
  };
}

export function parseCadenceResponse(input: string): CadenceStep[] {
  const fallback: CadenceStep[] = [
    { day: 0, channel: 'email', subject: 'Apresentação rápida', body: 'Olá {{nome}}, notei a {{empresa}} e gostaria de compartilhar uma ideia.' },
    { day: 2, channel: 'linkedin', subject: 'Conexão no LinkedIn', body: 'Envio de convite personalizado com referência ao contexto da empresa.' },
    { day: 5, channel: 'email', subject: 'Follow-up com case', body: 'Compartilhar case relevante e CTA para conversa de 15 minutos.' },
    { day: 8, channel: 'call', subject: 'Script de ligação', body: 'Abertura, gancho de dor e pergunta de qualificação para avançar.' },
  ];

  const raw = extractJsonBlock(input);

  try {
    const parsed = JSON.parse(raw) as Array<Partial<CadenceStep>>;
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;

    const normalized = parsed.slice(0, 4).map((step, index) => ({
      day: Number.isFinite(step.day) ? Math.max(0, Number(step.day)) : fallback[index]?.day ?? index * 2,
      channel: step.channel === 'linkedin' || step.channel === 'call' || step.channel === 'email'
        ? step.channel
        : (fallback[index]?.channel ?? 'email'),
      subject: (step.subject || fallback[index]?.subject || `Step ${index + 1}`).slice(0, 140),
      body: (step.body || fallback[index]?.body || 'Mensagem').slice(0, 5000),
    }));

    return normalized.length === 4 ? normalized : [...normalized, ...fallback.slice(normalized.length, 4)];
  } catch {
    return fallback;
  }
}
