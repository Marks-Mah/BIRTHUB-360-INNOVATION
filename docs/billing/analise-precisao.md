# Análise de Precisão de Billing (Registrado vs Real)

Num modelo *usage-based*, a reconciliação entre o que o motor da aplicação (BirthHub360) registra como consumo de IA e o que é repassado ao provedor de faturamento (Stripe) precisa de uma margem de tolerância. Eventos distribuídos podem se perder em filas de retry, gerando discrepâncias entre o "Uso Real" (Apurado nos logs e faturas da OpenAI/Anthropic) e o "Uso Registrado" faturado contra o cliente final.

## 1. Tolerância Aceitável

É financeiramente inviável garantir 100.00% de precisão atômica num sistema distribuído de alto rendimento sem comprometer severamente a performance do serviço (locks rigorosos em cada *prompt* do LLM).

- **Tolerância Operacional Aceitável:** O BirthHub360 aceitará uma discrepância de **até 2% (Under-counting)** no volume de interações reportadas ao longo do mês.
- **Diretriz de Margem:** Como a taxa de lucro (markup) no *overage* de IA cobre o custo do LLM com uma margem segura, uma perda de 1-2% na contabilidade por falha na fila de mensagens ou indisponibilidade é compensada.

## 2. Over-counting vs. Under-counting
A regra de ouro da engenharia de billing SaaS B2B é: **É aceitável perder alguns centavos no under-counting, mas o over-counting (cobrar o cliente a mais) é imperdoável**, pois destrói a confiança na plataforma.

**Prevenção de Over-Counting:**
- Implementação rigorosa de `idempotency_key` ao reportar uso via `stripe.billing.MeterEvents.create()`.
- O cliente nunca será cobrado por fluxos de Agentes que resultaram em erro de inferência (Ex: Timeout da OpenAI ou erro 500 do orquestrador). O consumo deve ser contabilizado apenas no estágio final de sucesso do pipeline.

## 3. Amostragem de Auditoria
Todo mês, no dia 2, o sistema executará um script de auditoria que compara as três pontas:
1. **Source (Infraestrutura de IA):** A contagem de tokens reais registrada na camada de proxy do LLM (LangSmith / Helicone).
2. **Sistema (BirthHub360 DB):** A tabela consolidada `tenant_usage_logs` que o Orquestrador incrementou.
3. **Faturamento (Stripe):** O volume de "Units" faturado na linha de Overage da *Invoice*.

Se a diferença entre o Passo 2 e 3 for superior a 0,5%, os engenheiros receberão um alerta para investigar *drops* (mensagens perdidas) na Fila (RabbitMQ/BullMQ) antes do fechamento do ciclo. Se a discrepância for do Passo 1 para o Passo 2, significa que o sistema de workflow está deixando passar operações não taxadas.