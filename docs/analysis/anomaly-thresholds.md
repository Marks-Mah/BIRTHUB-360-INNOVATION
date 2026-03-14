# Limiares de Anomalia por Tenant (Tenant Anomaly Thresholds)

Em um ambiente Multi-Tenant, monitorar médias globais do sistema (ex: "O banco de dados está a 40% de CPU") oculta problemas graves que afetam um único cliente (ex: "O Tenant A está consumindo 39% da CPU sozinho e o resto do sistema 1%").

Para detectar comportamentos abusivos, falhas de integração ou ataques direcionados, o BirthHub360 utiliza **Limiares de Anomalia (Anomaly Thresholds)** específicos por Tenant, gerando alertas quando o uso de um recurso foge do padrão histórico daquela organização ou de um limite máximo pré-definido.

## 1. O Conceito de Thresholds (Limites) Dinâmicos e Estáticos

A detecção de anomalias baseia-se em duas abordagens no Datadog/Monitoramento:
*   **Limites Estáticos (Hard Thresholds):** Valores fixos que, se ultrapassados, indicam perigo imediato, independente do tamanho do cliente.
*   **Limites Dinâmicos (Machine Learning/Z-Score):** O sistema aprende o comportamento normal de um Tenant (ex: "O Tenant X faz 1.000 requests/hora toda terça-feira") e alerta se ele de repente fizer 50.000 requests/hora.

## 2. Thresholds e Justificativas Técnicas

### 2.1. Volume de Requisições da API (Request Rate)
*   **Métrica:** `nginx.requests.count {tenant_id:*}`
*   **Threshold Estático:** > 1.000 requests por minuto (Plano Pro).
*   **Threshold Dinâmico (Anomalia):** Picos de tráfego > 5x a média da mesma hora na semana anterior.
*   **Justificativa:** Prevenir ataques de Força Bruta (Brute Force) de senhas, Web Scraping desenfreado, ou loops infinitos em scripts de clientes consumindo a nossa API. (Aciona Rate Limiting ou Suspensão Temporária da Chave da API).

### 2.2. Taxa de Erro HTTP 5xx (Server Errors)
*   **Métrica:** `http.status_code:5* {tenant_id:*}`
*   **Threshold Estático:** > 5% das requisições do Tenant retornando erro 500 em uma janela de 5 minutos.
*   **Threshold Dinâmico:** N/A (Erros 500 nunca são um "novo normal").
*   **Justificativa:** Detecta se um Tenant específico encontrou um bug ou "Poison Pill" (ex: um dado corrompido ou nulo que faz a aplicação quebrar só para ele). Se o alarme apitar apenas para o `tenant_id=ABC`, a equipe de engenharia sabe imediatamente onde focar a investigação (Targeted Debugging).

### 2.3. Taxa de Erro HTTP 4xx (Client Errors - Principalmente 401/403)
*   **Métrica:** `http.status_code:401 OR 403 {tenant_id:*}`
*   **Threshold Estático:** > 100 erros de autenticação ou autorização em 1 minuto originados para o mesmo Tenant.
*   **Justificativa:** Indica fortemente uma tentativa de Credential Stuffing, enumeração de usuários (se o sistema for falho), ou uma chave de API revogada que um script no cliente continua tentando usar (Batendo no Auth Middleware repetidamente).

### 2.4. Tempo de Execução do Orquestrador (Workflow/Agent Latency)
*   **Métrica:** `agent.execution.duration_ms {tenant_id:*}`
*   **Threshold Estático:** > 120.000 ms (2 minutos) para qualquer workflow interativo (Síncrono).
*   **Justificativa:** Workflows de IA generativa (LLMs) são demorados por natureza, mas se o nó do LangGraph de um cliente trava por minutos (ex: chamando uma API do próprio cliente que não responde), ele segura *Workers* na nuvem, consumindo memória RAM (Out-of-Memory) e atrasando a fila de outros Tenants. O Orquestrador deve abortar (Timeout) e a anomalia é logada.

### 2.5. Consumo de Banco de Dados (Database I/O & Locks)
*   **Métrica:** `postgresql.slow_queries.count {tenant_id:*}`
*   **Threshold Estático:** Queries levando mais de 10 segundos para retornar.
*   **Justificativa:** Em *Shared Schema*, uma query ruim de um cliente degrada a performance de *todos os clientes do banco*. Esse é o "Noisy Neighbor" mais letal. Se um tenant estourar esse limiar, a query deve ser investigada e possivelmente morta (Kill PID). (Ver Política de Indexação e Runbook de Queries Lentas).

## 3. Resposta Automatizada a Anomalias (Auto-Remediation)

1.  Se o limite da *API Request Rate* for excedido, o API Gateway do BirthHub360 injeta o `HTTP 429 Too Many Requests` isolando o Tenant sem intervenção humana.
2.  Se a *Taxa de Erro 5xx* exceder 15% apenas para um Tenant (e a latência global subir), o Circuit Breaker abre, falhando os requests dele instantaneamente para poupar recursos.
3.  As anomalias críticas engatilham os Alertas PagerDuty para o Engenheiro SRE on-call (Classificação: SEV-2 Investigação).