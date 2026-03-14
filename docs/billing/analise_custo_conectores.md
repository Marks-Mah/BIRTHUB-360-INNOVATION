# Análise de Custo por Conector em Execuções de Agent Packs

Este documento traça uma projeção e métricas-base do impacto em custos operacionais e limites (rate limits) induzidos pelos conectores durante a execução padrão de Agent Packs do BirthHub360. A infraestrutura de AI atua frequentemente em loop (raciocínio -> chamada externa -> raciocínio), o que pode multiplicar as faturas de APIs baseadas em consumo se não houver governança (o chamado *Custo de Integração Invisível*).

## Parâmetros da "Execução Típica" (Baseline)

Consideramos uma **"Execução Típica" (ET)** como a resolução bem-sucedida de um workflow corporativo comum.
Exemplo: Um SDRAgent pesquisando um Lead Inbound, qualificando-o e registrando as anotações no CRM (Salesforce) e disparando um alerta no Slack.

## Modelagem e Estimativa de Custos por Conector

Abaixo, os 5 conectores mais pesados da plataforma com o perfil estimado de requisições por ET:

### 1. Conector Salesforce / Hubspot (CRM Core)
*   **Volume na ET:** 3 a 5 chamadas API. (1x Busca de Contato, 1x Busca de Organização/Conta, 1-2x Queries customizadas para notas anteriores, 1x Update final).
*   **Custo por Request (Provedor):** Quase zero em dólares diretos, porém, operam em rigorosos **limites de API do plano do cliente** (ex: 10.000 requisições/dia no plano Pro).
*   **Risco Financeiro/Operacional:** Bloquear a operação humana (sales reps) se os agentes gastarem toda a cota de API da empresa.
*   **Ação:** Cache local (ex: Redis) das contas acessadas nos últimos 15 min. Agrupar inserts (Batch API) sempre que for possível.

### 2. Conector Clearbit / Apollo (Enriquecimento de Dados B2B)
*   **Volume na ET:** 1 a 2 chamadas.
*   **Custo por Request (Provedor):** \~$0.01 a $0.05 por pessoa/empresa encontrada.
*   **Risco Financeiro/Operacional:** Se um LDRAgent processar uma lista fria de 10.000 contatos sem validação prévia de e-mail (bounce check), o custo num único batch pode ultrapassar $500.
*   **Ação:** Implementar Hard Limits mensais (guardrails) de orçamento ($ USD) atrelados ao plano do cliente (Billing Tier).

### 3. Conector Serper / Google Custom Search (Web Search)
*   **Volume na ET:** 2 a 4 buscas para "Dúvidas Long-tail" ou "Recentes Notícias do Account".
*   **Custo por Request:** \~$0.001.
*   **Risco Financeiro/Operacional:** Baixo custo absoluto, mas gera alta latência (impacto em UX).
*   **Ação:** Impor limite (guardrail paramétrico) no manifesto do Agente de no máximo 3 buscas por sessão.

### 4. Conector Twilio / Vonage (Comunicações SMS/Voz)
*   **Volume na ET:** 1 chamada transacional (Apenas AEs / Closers / Pós-Venda em Alertas de Churn).
*   **Custo por Request:** \~$0.008 a $0.02.
*   **Ação:** Exige Human-In-The-Loop para qualquer batch de mensagens ou chamadas discadas via agentes autônomos.

## Conclusões para o Modelo de Pricing (Tiering)

O custo de operação de um agente `tier:high` (como um **Research Analista**) não vem somente da queima massiva de tokens de LLM, mas fundamentalmente da orquestração de APIs pagas (Conectores).

Por isso, o **Tier do Agent Pack** (documentado no `manifest.yaml`) orientará o modelo de Assinatura do BirthHub360:
*   **Tier Low:** Baseado primordialmente em lógica interna, consultas gratuitas ao nosso próprio Banco de Dados ou CRMs do cliente (dentro do Rate Limit).
*   **Tier Medium:** Usa ferramentas de e-mail e CRMs com consumo moderado.
*   **Tier High:** Requer acesso irrestrito às contas de provedores DaaS (Data as a Service) terceirizados para mineração profunda e executa centenas de steps no LangGraph.
