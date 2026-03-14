# Runbook: Incidente Específico de um Único Tenant (Tenant-Specific Incident)

Este runbook orienta engenheiros e analistas SRE/NOC do BirthHub360 a isolarem e mitigarem um incidente que está impactando gravemente a operação ou performance de um *único* cliente (Tenant), evitando que a falha se espalhe para outros clientes no mesmo ambiente (Shared Schema).

Um incidente "Tenant-Specific" ocorre quando a plataforma inteira reporta status verde (Operacional) no StatusPage, mas o Monitoramento (Datadog/New Relic) apita anomalias concentradas em um único `tenant_id`.

## 1. Identificação do Incidente e Gatilhos

### Sintomas Comuns:
1.  **Explosão de Erros 5xx:** O Tenant A está recebendo centenas de erros HTTP 500 ao tentar gerar relatórios ou processar Agentes, enquanto o Tenant B (e todos os outros) navegam normalmente.
2.  **Lentidão Extrema (High Latency):** As requisições do Tenant A estão batendo timeout (30s) constantemente, indicando queries presas ou loops no frontend.
3.  **Fila de Jobs Travada (Queue Backlog):** Milhares de eventos do Tenant A acumulados na fila de mensageria (RabbitMQ/SQS), consumindo os recursos dos workers e ameaçando retardar os jobs dos Tenants B e C (Efeito Noisy Neighbor).

### Confirmação:
1.  No Datadog (ou ferramenta APM), filtre as métricas de erro ou latência pela tag/faceta `tenant_id`.
2.  Se o gráfico mostrar que 99% dos erros ou requisições lentas pertencem ao mesmo UUID de Tenant, **declare um Incidente Tenant-Specific**.

## 2. Ações de Isolamento e Mitigação (Contenção)

O objetivo principal não é resolver o bug do cliente imediatamente, mas sim **proteger a plataforma (Efeito Cascata)** e impedir que o problema afete os SLAs de outros clientes pagos.

### 2.1. O "Botão de Pânico" (Soft Suspension)
Se o problema for causado por uma integração maliciosa/bugada do cliente disparando milhares de requisições por segundo (DDoS Acidental):
*   **Ação:** Use o Painel Administrativo do BirthHub360 (Ou via AWS CLI/Redis) para revogar temporariamente as API Keys do Tenant afetado.
*   **Ação Alternativa:** Ative a "Manutenção Forçada" para esse `tenant_id` específico (colocando-o no modo *Read-Only* ou retornando 429 Too Many Requests globalmente no Gateway), forçando os scripts dele a parar de agredir nosso banco de dados.

### 2.2. Otimização de Fila (Queue Isolation)
Se o Tenant encheu a fila principal de jobs (ex: disparou 5 milhões de e-mails em loop por um bug de workflow):
*   **Ação:** Usando a interface de gerenciamento da fila (ex: RabbitMQ Management UI ou script de emergência), pause o consumo das mensagens que pertencem a esse Tenant ou mova as mensagens dele para a `Dead Letter Queue (DLQ)` temporariamente.
*   **Recuperação:** Crie uma fila secundária dedicada (Isolada) apenas para esvaziar o backlog dele sem usar os workers principais do plano Pro/Enterprise.

### 2.3. Isolamento de Consultas Lentas (Database Throttle)
Se uma query complexa do Tenant está matando a CPU do RDS (Ver *Runbook de Slow Queries*):
*   **Ação:** Mate os processos (PIDs) ativos do PostgreSQL que estiverem rodando as consultas problemáticas desse `tenant_id` há mais de 60 segundos (`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query ILIKE '%tenant_id_a%' AND state = 'active'`).

## 3. Investigação da Causa Raiz (Root Cause)

Uma vez que a plataforma esteja protegida e o sangramento estancado, inicie a investigação do *Por Quê*:

1.  **Dados Corrompidos (Poison Pill):** O Tenant importou um arquivo malformado ou inseriu um caractere especial que o parser JSON/XML não tratou e está explodindo exceções (Crash Loop)?
2.  **Modelagem Extrema:** O Tenant tem 100x mais dados que o cliente médio e atingiu um gargalo de performance não previsto no PostgreSQL (Falta de índices compostos em tabelas gigantes)?
3.  **Configuração de Integração (Bad Gateway):** O Tenant configurou um Webhook de saída (Outbound) apontando para o servidor dele, e o servidor dele está fora do ar (Timeout), fazendo o BirthHub360 segurar a conexão HTTP por muito tempo até estourar nossos próprios limites?

## 4. Comunicação e Resolução

1.  **Comunicação Proativa:** Acione a política de comunicação (`docs/policies/incident-communication-policy.md`). O Gerente de Contas (TAM) ou Suporte deve contatar os administradores do Tenant informando que detectamos anomalias geradas por eles e que aplicamos medidas de contenção para manter a estabilidade.
2.  **Deploy do Fix:** Se foi um bug de software (Poison Pill), abra um Hotfix (PR).
3.  **Reativação:** Após a aprovação e deploy, reverta as suspensões e religue as chaves de API/Workers para o Tenant voltar à operação normal, validando os SLAs.