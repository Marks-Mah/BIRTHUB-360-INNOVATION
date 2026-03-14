# Modelo de Custo por Agente: LLM Tokens + Chamadas de API

Este documento detalha o framework utilizado pelo BirthHub360 para estimar e monitorar o custo de execução de cada Agent Pack. O objetivo é evitar surpresas no billing e possibilitar o enquadramento correto nos tiers de precificação.

## Estrutura do Custo (Fórmula Base)

O custo total de uma execução típica ($C_E$) é calculado pela soma do custo do LLM ($C_{LLM}$) e do custo dos conectores ($C_{API}$):
**C_E = C_LLM + C_API**

### 1. Custo de Raciocínio (C_LLM)
As etapas no LangGraph (StateGraph) implicam múltiplas idas e vindas ao modelo.
*   `Tokens de Input`: (Prompt do Sistema + Estado Histórico + Schema das Tools) * `N` iterações.
*   `Tokens de Output`: (Respostas de Raciocínio (Thought) + Tool Calls + Resposta Final).
*   *Estimativa Padrão (GPT-4o-mini)*: $0.15 / 1M input e $0.60 / 1M output. Uma execução típica com 3 tool calls consome cerca de 4000 tokens de input e 500 de output (\~$0.0009).

### 2. Custo de Ferramentas / Conectores (C_API)
Este é frequentemente o "custo oculto".
*   `APIs In-house` (ex: Busca no Banco Vetorial nativo do tenant): Custo próximo a $0.
*   `APIs B2B SaaS` (ex: Hubspot, Salesforce): Custo base nulo (incluso na licença do cliente), mas consome rate limits críticos.
*   `APIs DaaS / Pagas por uso` (ex: Clearbit, Twilio, Apollo): Custos unitários altos. Ex: 1 chamada Clearbit = $0.05.

## Definição de Tiers de Custo no Manifest (`tier:`)

Com base nesse modelo matemático, o manifesto deve obrigatoriamente classificar o agente:

*   `tier:low`: C_E estimado < $0.001. Apenas LLM pequeno, sem APIs pagas externas. (Ex: Reviewer de Texto).
*   `tier:medium`: C_E estimado entre $0.001 e $0.01. (Ex: SDRAgent com pesquisa padrão no LinkedIn/Serper).
*   `tier:high`: C_E estimado > $0.01 por execução. (Ex: AnalystAgent usando múltiplos DaaS ou OCR em contratos extensos).

## Monitoramento (Observabilidade)
A camada de runtime intercepta a emissão (CallbackHandler) e registra os `total_tokens` e a contagem de `tools_called` de cada gravação de Estado no LangGraph, atualizando a tabela de consumo mensal do Tenant.
