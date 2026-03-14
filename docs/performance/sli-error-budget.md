# Definição de SLIs e Cálculo de Error Budget

No paradigma de Site Reliability Engineering (SRE) adotado pelo BirthHub360, não buscamos 100% de confiabilidade, pois isso é matematicamente impossível e inibe a velocidade de inovação. Em vez disso, operamos com "Orçamentos de Erro" (Error Budgets) baseados em Service Level Indicators (SLIs) precisos.

Este documento define quais métricas formam nossos SLIs e como calculamos o limite de falhas aceitáveis antes de intervirmos.

## 1. O que é um SLI no contexto de Agentes?

Service Level Indicator (SLI) é a medida quantitativa do nível de serviço fornecido. Diferente de uma API REST simples (onde SLI é apenas "HTTP 200 vs 500"), um agente tem estados de falha mais sutis.

Nossos SLIs Primários são baseados na fórmula: `(Eventos Bons / Eventos Totais) * 100`.

### A. SLI de Sucesso de Execução (Reliability)
*   **Evento Válido (Total):** Qualquer Job de agente que entra no Orquestrador e não é rejeitado imediatamente por rate-limit ou policy violation (pois esses são bloqueios esperados e corretos).
*   **Evento Bom (Good):** O Job conclui e retorna uma resposta ao usuário (mesmo que a resposta seja "Desculpe, não consegui fazer isso porque a API externa falhou" - Graceful Degradation).
*   **Evento Ruim (Bad):** O Job trava por timeout global (`max_execution_time`), o worker sofre crash (OOM), ou o código Python levanta uma exceção não tratada devolvendo "Internal Server Error" ao usuário.
*   **A Fórmula:** `Success Rate = 100 - ((Jobs_Failed / Jobs_Started) * 100)`

### B. SLI de Latência (Performance)
*   **Evento Válido (Total):** Qualquer Job *síncrono* (iniciado via chat UI que exige resposta em tempo real). Jobs assíncronos de batch não entram no SLI de latência síncrona.
*   **Evento Bom (Good):** O Job conclui e entrega a resposta final em menos de `X` segundos (Onde X é 5s para Pro e 2s para Enterprise, conforme `agent-slo.md`).
*   **A Fórmula:** `Fast Responses Rate = (Jobs_Sync_Under_Threshold / Total_Sync_Jobs) * 100`

## 2. O que é o Error Budget e Como Calcular?

O **Error Budget** é a quantidade exata de falhas (Eventos Ruins) que podemos tolerar em uma janela de tempo de **30 dias consecutivos (Rolling Window)** sem violar o SLO assinado com o cliente (Contrato).

### A Matemática do Error Budget

Tomemos como exemplo o Plano **PRO**, que possui um SLO de Sucesso de **99.0%**:

*   **Taxa de Falha Tolerada (Allowed Fail Rate):** `100% - 99.0% = 1.0%`
*   Se um tenant Pro executa seu agente **10.000 vezes** em um mês:
*   `Error Budget = 10.000 * 0.01`
*   **Error Budget = 100 Falhas Permitidas.**

Isso significa que o Agente daquele Tenant pode falhar miseravelmente (Timeout, OOM) **100 vezes** naquele mês antes que o contrato de SLA seja violado e o cliente tenha direito a receber créditos (Penalidade).

### Monitoramento de Consumo (Burn Rate)

O Datadog não monitora apenas o total, mas a "velocidade da queima" (Burn Rate) do orçamento.

*   Se o orçamento é de 100 falhas para 30 dias (média de ~3.3 falhas/dia toleradas).
*   E um bug introduzido às 14:00 causa **50 falhas em apenas 1 hora**.
*   O *Burn Rate* está criticamente alto. Se continuar assim, o orçamento do mês inteiro será consumido em 2 horas.
*   **Ação:** Um alerta de "High Burn Rate" aciona imediatamente o PagerDuty do Engenheiro de Plantão (On-Call), acionando o Runbook de Triagem (`high-fail-rate-triage.md`), *mesmo que o SLO total dos 30 dias ainda não tenha sido quebrado*.

## 3. Consequências de Esgotar o Error Budget

Quando o SLI de uma frota de agentes cai abaixo da meta (Error Budget = 0):

1.  **Congelamento de Deploys (Code Freeze):** O time de produto perde o direito de fazer merge de novas funcionalidades (features) ou publicar novos manifestos de agentes.
2.  **Foco Exclusivo em SRE:** 100% do esforço do sprint de engenharia deve ser redirecionado para estabilizar a plataforma, refatorar código frágil, melhorar a resiliência das Tools (ADR-017) ou otimizar queries de banco de dados.
3.  O congelamento só é suspenso quando a janela móvel de 30 dias se recuperar o suficiente para trazer o SLI de volta para cima do SLO (ex: > 99.0%).
