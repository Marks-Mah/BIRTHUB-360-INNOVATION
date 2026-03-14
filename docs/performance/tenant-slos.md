# Service Level Objectives (SLOs) por Tenant e por Plano

Este documento define as metas de Nível de Serviço (SLOs - Service Level Objectives) que o BirthHub360 se compromete a entregar aos seus clientes (Tenants), diferenciadas por plano de assinatura. Ele serve de base para os Acordos de Nível de Serviço (SLAs) comerciais e para as políticas de monitoramento da equipe de Engenharia (SRE).

Em um ambiente Multi-Tenant (Shared Schema), o maior desafio é garantir que a degradação de um tenant pesado ("Noisy Neighbor") não quebre o SLO dos tenants menores.

## 1. Definições de Métricas
*   **Availability (Disponibilidade / Uptime):** A porcentagem de tempo que a API pública e o Dashboard (Web UI) respondem com HTTP 2xx ou 3xx (excluindo janelas de manutenção programada). Erros 5xx contam como indisponibilidade. Erros 4xx (causados pelo cliente, ex: Bad Request ou Rate Limit) *não* contam como indisponibilidade.
*   **Latência (p95):** O tempo máximo que 95% das requisições síncronas (ex: listar pacientes, ver dashboard) levam para ser processadas pelo backend do BirthHub360 (excluindo a latência da rede de internet do cliente).
*   **Tempo de Resposta Assíncrona (Queue Time p95):** O tempo máximo que um job (ex: processamento de IA por um Agente, disparo de e-mail, geração de relatório) aguarda na fila antes de começar a ser processado.

## 2. SLOs por Plano de Assinatura

### 2.1. Plano Free (Gratuito)
*   **Availability:** 99.0% (Aprox. 7h 18m de downtime permitido por mês). Não há SLA financeiro/compensação.
*   **Latência API (p95):** < 1000ms.
*   **Queue Time (p95):** < 15 minutos. (Rodam em filas de menor prioridade/Spot Instances, podendo demorar em horários de pico).
*   **Suporte:** Fórum / Comunidade apenas.

### 2.2. Plano Starter
*   **Availability:** 99.5% (Aprox. 3h 39m de downtime permitido por mês).
*   **Latência API (p95):** < 600ms.
*   **Queue Time (p95):** < 5 minutos.
*   **Suporte:** E-mail (Resposta em até 48h úteis).

### 2.3. Plano Pro (O Padrão B2B)
*   **Availability:** 99.9% ("Three Nines" - Aprox. 43 minutos de downtime permitido por mês). Se violado, o cliente pode exigir créditos na próxima fatura (SLA Comercial).
*   **Latência API (p95):** < 300ms.
*   **Queue Time (p95):** < 1 minuto. (Filas de processamento dedicadas a clientes Pro).
*   **Suporte:** E-mail / Ticket Prioritário (Resposta em até 8h úteis).

### 2.4. Plano Enterprise (Customizável)
*   **Availability:** 99.95% a 99.99% (Contratos com instâncias reservadas ou Single-Tenant Dedicado).
*   **Latência API (p95):** < 150ms.
*   **Queue Time (p95):** < 10 segundos. (Workers Exclusivos / Infraestrutura Isolada).
*   **Suporte:** TAM (Technical Account Manager), Slack compartilhado, e Resposta 24/7 (SLA de 1h para Incidentes Críticos).

## 3. Estratégias de Defesa do SLO (Isolamento de Impacto)

Para garantir que o Plano Pro atinja seus 99.9%, o BirthHub360 implementa:
1.  **Rate Limiting Estrito:** Clientes que disparam rajadas de requests recebem 429 Too Many Requests, protegendo o pool de conexões do banco de dados e mantendo a latência baixa para os demais.
2.  **Circuit Breakers por Tenant:** Se um webhook de um cliente (Tenant A) estiver lento e falhando seguidamente (timeout do servidor de destino), o BirthHub360 abre o circuito apenas para aquele Tenant. Os requests de webhook dele passam a falhar rapidamente (Fail Fast), liberando os workers para processar os webhooks do Tenant B.
3.  **Filas Multi-Tier:** Separar os jobs no RabbitMQ/SQS por plano (`queue_free`, `queue_pro`, `queue_enterprise`). Isso garante que um ataque de Bulk Import de 1 milhão de linhas no plano Free não trave o relatório mensal de um cliente Pro.