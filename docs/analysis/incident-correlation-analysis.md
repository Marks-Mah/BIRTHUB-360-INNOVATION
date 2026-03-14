# Análise de Correlação de Incidentes: Múltiplos Tenants vs. Único Tenant (Blast Radius)

O "Raio de Impacto" (Blast Radius) de um incidente de software ou infraestrutura no BirthHub360 é a métrica mais crítica para a priorização (Triagem) e resposta a incidentes pelas equipes de SRE (Site Reliability Engineering) e DevOps.

Em uma arquitetura Multi-Tenant baseada em Shared Schema e Filas Globais, um problema em uma parte do sistema pode rapidamente se espalhar (Cascading Failure), derrubando a plataforma inteira. Compreender a correlação de métricas é vital para diagnosticar se a falha está contida ou descontrolada.

## 1. O Padrão de Análise de Falhas (Sintomas e Diagnósticos)

Quando os alarmes disparam (ex: Datadog/PagerDuty aponta aumento de latência e erros HTTP 500), a primeira pergunta do engenheiro On-Call deve ser: **"Isto afeta um único cliente (Tenant-Specific) ou a plataforma inteira (Multi-Tenant/Global)?"**

### 1.1. Cenário A: Incidente Multi-Tenant (Global Outage)
*   **Sintomas de Correlação:** Os erros (HTTP 5xx) ou lentidão (p95 > 2s) estão uniformemente distribuídos entre *múltiplos* `tenant_id`s simultaneamente nas métricas.
*   **Diagnósticos Prováveis (Causas Raízes Comuns):**
    1.  **Infraestrutura Core Caiu:** O banco de dados primário (RDS) reiniciou (Failover), o cluster Redis (Cache/Rate Limit) ficou indisponível, ou o provedor de DNS (Route 53/Cloudflare) está com problemas.
    2.  **Deploy Quebrado (Bad Release):** A equipe fez o deploy de um novo código na API que introduziu um `SyntaxError`, ou uma Migration no banco de dados bloqueou tabelas essenciais (Locking) para todos os clientes.
    3.  **Dependência Externa Global (LLM Down):** A API da OpenAI/Anthropic caiu ou está devolvendo HTTP 503 para a conta corporativa do BirthHub360, travando os Agentes de *todos* os clientes.
*   **Ação Imediata:** Declaração de Incidente Maior (SEV-1), War Room aberta, Rollback imediato do último deploy, comunicação no StatusPage.

### 1.2. Cenário B: Incidente Tenant-Specific (Noisy Neighbor / Poison Pill)
*   **Sintomas de Correlação:** A métrica global de erros subiu para 10%, mas ao agrupar/filtrar (Facet) por `tenant_id`, **99.9% dos erros** estão atrelados ao `Tenant_A`. O `Tenant_B` e o `Tenant_C` continuam com 0% de erro e latência normal.
*   **Diagnósticos Prováveis (Causas Raízes Comuns):**
    1.  **Dado Corrompido (Poison Pill):** O Tenant_A importou um arquivo malformado ou cadastrou um caractere especial que quebra o parser do backend apenas na tela de listagem dele. O código da API dá "Crash" só quando ele tenta ler.
    2.  **Gargalo de Volume (Noisy Neighbor):** O Tenant_A disparou um webhook ou loop infinito via API que entupiu a fila dele. Ou uma query dele, por ele ter 10 milhões de linhas de histórico (contra a média de 10 mil dos outros clientes), está fazendo *Sequential Scan* e demorando 45 segundos para retornar.
    3.  **Integração Quebrada (Webhooks de Saída):** O Tenant_A configurou o BirthHub360 para enviar webhooks para o servidor *dele*, mas o servidor *dele* está desligado. O BirthHub360 segura a conexão até o timeout, acumulando erros apenas nos logs desse Tenant.
*   **Ação Imediata:** Aplicação do *Runbook de Incidentes Específicos por Tenant* (`docs/runbooks/tenant-specific-incident-runbook.md`). Isolar a fila do cliente, cortar conexões do cliente (Circuit Breaker) e investigar os dados específicos dele (sem impactar o deploy global).

## 2. O Perigo da Mutação de Falha (De Específico para Global)

A análise de correlação mais perigosa é detectar quando um erro "Tenant-Specific" não foi contido a tempo e mutou para um "Global Outage". Isso acontece devido ao esgotamento de recursos compartilhados (Resource Exhaustion).

**O Fluxo de Cascata (Cascading Failure):**
1.  **T=0 (Isolado):** `Tenant_A` envia uma query de agregação não indexada (Slow Query) que exige 10 GB de RAM do banco de dados PostgreSQL.
2.  **T+1 min:** O `Tenant_A` abre o dashboard e, como a tela demora a carregar, ele pressiona "F5" (Refresh) 20 vezes em desespero.
3.  **T+2 min:** O banco de dados agora tem 20 queries idênticas rodando, consumindo 100% da CPU e da RAM.
4.  **T+3 min (Mutação para Global):** As conexões do `Tenant_B` e `Tenant_C` para o banco de dados entram em fila de espera (Connection Pool Starvation). Seus *Requests* dão Timeout na API e viram HTTP 504 (Gateway Timeout).
5.  **T+4 min:** O que começou como uma query lenta do Tenant A (Visível apenas nas métricas dele no T=0), agora derrubou a plataforma inteira (Todos os Tenants reportam erros no T+3).

**A Importância da Contenção (Circuit Breakers):**
Para que a Correlação de Incidentes (Monitoramento) funcione, o sistema *deve* ter limites arquiteturais estritos (Rate Limiting, Timeouts agressivos de 5s a 10s no banco, Circuit Breakers e Isolamento de Filas - Bulkheads). Sem eles, todo incidente específico rapidamente se torna global, invalidando a capacidade de diagnosticar quem causou o problema antes que o servidor caia. A análise de correlação no T=0 é a janela vital que o SRE tem para "matar" a query do Tenant A antes do T+3.