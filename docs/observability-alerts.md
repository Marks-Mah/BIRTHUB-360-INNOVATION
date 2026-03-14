# Alertas Mínimos de Observabilidade

O BirthHub 360 deve garantir alta disponibilidade de seus Agentes de Negócios B2B e da Interface de Dashboard. Para isto, configuramos limites baseados em SLI (Service Level Indicators) nos provedores de nuvem para disparar alertas automáticos no canal do Slack ou PagerDuty para acionamento de On-Call. O ruído deve ser minimizado, alertando a equipe primariamente com base no impacto ao usuário final ou violação do nosso SLA/SLO.

## Regras e Níveis de Alerta

Cada alerta será emitido com uma gravidade (Severity) vinculada diretamente a uma criticidade documentada: `P0 (Crítico)` ou `P1 (Atenção)`.

### 1. API Gateway / Frontend

**Erro Rate 5xx (HTTP)**

- **Threshold**: `> 1%` dos requests totais retornando HTTP 500-599 em uma janela de 5 minutos.
- **Action**: Alert `P0`. Significa falha sistêmica, queda do Gateway, ou falha massiva no banco de dados base.

**High Latency (P95 Latency HTTP)**

- **Threshold**: P95 do tempo de resposta `> 800ms` nos últimos 10 minutos (ignorando Webhooks pesados já delegados).
- **Action**: Alert `P1`. Pode ser indicativo de um pico anômalo de uso, query pesada ou degradação temporária dos provedores de nuvem. Requer investigação para evitar timeout.

### 2. Agentes de IA e Orchestrator (LangGraph / Python)

**Taxa de Sucesso dos Handoffs (Workflows)**

- **Threshold**: `> 5%` das instâncias do LangGraph falhando com erro fatal (Fatal Exceptions) nos últimos 15 minutos.
- **Action**: Alert `P0`. O orquestrador não está conseguindo enviar as tarefas para os agentes filhos, ou os agentes retornaram erros estruturados (schema não validado pelo Pydantic repetidas vezes).

**Degradação Externa (Latência LLM/Integrações)**

- **Threshold**: Latência média de chamadas LLM (`OpenAI`, `Gemini`) ou integrações (`Stripe`, `Pipedrive`) ultrapassa o dobro do histórico baseline (`> 30s` em chamadas síncronas LLM) durante 15 minutos contínuos.
- **Action**: Alert `P1`. O sistema pode estar sendo impactado por um incidente "outage" no fornecedor (ex: OpenAI fora do ar). Ativar os fallbacks disponíveis.

### 3. Fila (Queue / Worker BullMQ)

**Build-Up (Fila Enchendo)**

- **Threshold**: `> 500` jobs acumulados na fila principal aguardando processamento por mais de 5 minutos sem diminuição (Rate de consume menor que rate de envio).
- **Action**: Alert `P1`. Escalabilidade necessária nos workers. Os containers não estão dando conta da demanda (Ex: disparo massivo de cadências de prospecção do LDR).

**Dead Letter Queue (DLQ Rate)**

- **Threshold**: `> 10%` dos jobs enviados vão para a DLQ no período de 15 minutos (ou falhas fixas após todas as retentativas esgotadas do BullMQ).
- **Action**: Alert `P0`. Há uma falha lógica de código num Worker (Ex: Payload inesperado gerando crash em lote).

### 4. Infraestrutura (Nodes / BD)

**Saturação de Banco de Dados**

- **Threshold**: Conexões simultâneas esgotando (Pooling Maxed Out) ou uso de CPU de banco de dados `> 85%` por mais de 10 minutos contínuos.
- **Action**: Alert `P0`. Possibilidade de outage ou queries descontroladas N+1 via Prisma (necessita analise imediata e possivel upgrade emergencial do banco).

### Ações Pós-Alerta

A emissão do alerta inicia o **Runbook de Investigação de Incidente** (`docs/runbooks/incident-investigation.md`). Alertas P1 exigem notificação da equipe durante horário comercial; alertas P0 enviam acionamento via "Pagging" (PagerDuty) independentemente da hora.
