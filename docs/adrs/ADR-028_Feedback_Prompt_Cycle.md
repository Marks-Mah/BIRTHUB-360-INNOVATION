# ADR 028: Ciclo de Melhoria de Prompts Alimentado por Feedback de Usuário

## Status
Aceito

## Contexto
O BirthHub 360 opera milhares de interações diárias onde os Agentes IA geram textos (E-mails, Relatórios, Diagnósticos). A qualidade dessas saídas varia conforme as atualizações dos modelos fundamentais (ex: OpenAI GPT-4o) ou a introdução de casos de uso não mapeados pelos clientes. Atualmente, descobrimos que os prompts estão "quebrados" ou "alucinando" apenas quando clientes ameaçam cancelar a assinatura (Churn). Precisamos de um mecanismo arquitetural sistemático para ingerir sinais fracos (telemetria de feedback) e retroalimentar o desenvolvimento dos prompts antes do churn ocorrer.

## Decisão
Adotaremos um **Closed-Loop Feedback System (Sistema de Feedback em Loop Fechado)** para a engine de prompts, suportado pelas seguintes regras arquiteturais:

1. **Obrigatoriedade do Widget de Avaliação:** Todo componente de UI que renderize o output final de um Agente IA (seja um e-mail rascunho ou um card de resumo) DEVE conter componentes de aprovação/rejeição (Thumbs Up / Thumbs Down).
2. **Ingestão Estruturada:** Um voto negativo não dispara apenas um evento no Mixpanel. Ele grava uma linha na tabela `agent_feedback_log` (PostgreSQL) contendo: `execution_id`, `agent_pack_id`, `prompt_version`, `user_feedback_category` e a referência ao payload de entrada/saída (armazenado no Object Storage).
3. **Pipeline de Observabilidade de LLM:** Integraremos uma ferramenta dedicada de LLMOps (ex: LangSmith ou Braintrust) ao nosso orquestrador (LangGraph).
4. **Trigger de Avaliação (CI/CD para Prompts):** Toda alteração no `system_prompt` de um Agente oficial deverá ser validada contra um "Dataset Dourado" (Golden Dataset) construído dinamicamente a partir dos históricos com "Thumbs Down". O novo prompt deve provar, via LLM as a Judge (usando um modelo mais potente e caro estritamente para avaliação), que resolve a queixa daquele ID específico.

## Consequências
**Positivas:**
- Redução do MTTR (Mean Time to Resolution) para "Bugs de Prompt", transformando reclamações vagas em testes unitários determinísticos.
- Proteção da Métrica North Star: Um ciclo de feedback rápido garante que a confiança no "Modo Auto-Pilot" se mantenha alta.

**Negativas / Trade-offs:**
- Aumento no custo de armazenamento de logs (precisamos guardar o contexto exato do momento da geração para poder "re-rodar" o cenário no debug).
- Complexidade adicional no pipeline de CI/CD, que agora deve avaliar não apenas código determinístico (Python), mas também a variação probabilística dos LLMs.
