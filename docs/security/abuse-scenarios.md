# Cenários de Abuso e Vetores de Ataque (Abuse Scenarios)

Este documento mapeia os principais cenários documentados onde usuários legítimos (autenticados) ou anônimos (scripts) tentam abusar da infraestrutura e regras de negócios do BirthHub360 para obter vantagens indevidas, extrair dados ou causar degradação de serviço (Denial of Service).

## 1. Bots de Scraping (Data Harvesting)

**O Cenário:**
Um usuário de plano Free (ou competidor disfarçado) cria uma conta e escreve um script (ex: Python/Puppeteer) que percorre o painel do BirthHub360 e, através de requisições `GET`, tenta varrer dados públicos, nomes de médicos, listas de hospitais (dicionários da plataforma) ou raspar diretórios visíveis de outras empresas.
*   **Sintomas:** Elevado volume de GET requests (Centenas por minuto) originados do mesmo `tenant_id` ou de um mesmo IP, todos ocorrendo com espaçamentos regulares de tempo.
*   **Mitigação (Defesa em Profundidade):**
    *   **Rate Limiting no Gateway:** Restrição severa (ex: 60 rpm para plano Free).
    *   **WAF / Bot Protection:** Regras no AWS WAF (ou Cloudflare) bloqueando IPs de Data Centers conhecidos (ex: DigitalOcean, AWS) para requisições na API pública.
    *   **Mascaramento de IDs:** Impossibilidade de varredura iterativa por ID sequencial (Enumeração - Ver documento de Risco de Enumeração).

## 2. DDoS Transacional via API Key (Volume e Computação)

**O Cenário:**
Um cliente no plano Pro tem sua API Key de integração vazada no GitHub ou, por malícia (cliente revoltado), utiliza um cluster para enviar 50.000 requisições simultâneas e complexas de busca `POST /api/v1/search` com filtros absurdos.
*   **Sintomas:** A CPU do RDS/PostgreSQL dispara. O cache começa a sofrer thrashing (evicção constante). O Connection Pool (PgBouncer) esgota suas conexões ativas. Outros clientes (Tenants) sofrem timeouts (HTTP 504).
*   **Mitigação (Defesa em Profundidade):**
    *   **Circuit Breakers por Tenant:** O Gateway da API e os Middlewares devem implementar o padrão de "Circuit Breaker" atrelado ao `tenant_id`. Se as requisições de um tenant falharem em massa, ou se ele esgotar sua cota isolada de conexões, os requests dele passam a receber `HTTP 429 Too Many Requests` *imediatamente no Gateway* antes mesmo de chegar à camada de banco de dados.
    *   **Revogação de API Keys Ativa:** Mecanismos de detecção de anomalia que suspendem ou rotacionam automaticamente a API Key e disparam um e-mail para o Owner do Tenant se o limite exceder a média em 500% num curto intervalo.

## 3. Abuso de Bulk Import (Job Queues e Out-of-Memory)

**O Cenário:**
Um usuário tenta realizar um bypass dos limites do plano "Free" carregando arquivos. Em vez de criar um por um (onde seria bloqueado), ele usa o recurso de Importação em Lote (CSV/Excel) e faz o upload de uma planilha de 500 MB com 1 milhão de linhas ou células formatadas de forma maliciosa (ex: Billion Laughs Attack em XML).
*   **Sintomas:** O serviço de workers/celery enche a memória (OOM Killed). Tarefas normais na fila ficam travadas atrás dessa tarefa gigante. O disco do banco de dados enche subitamente por inserção desenfreada.
*   **Mitigação (Defesa em Profundidade):**
    *   **Limite Estrito de Tamanho de Upload:** O Nginx/API Gateway recusa payloads maiores que 5MB (ex: `client_max_body_size 5M`).
    *   **Validação Prévia (Dry Run Limitado):** O script de importação só processa as primeiras 1.000 linhas por arquivo e recusa prosseguir se o total de linhas do CSV for maior que o limite restrito do plano do usuário (`linhas > limite_disponivel`).
    *   **Filas Isoladas (Tenant Isolation Queue):** Clientes Free/Starter devem processar jobs em uma fila de baixa prioridade (Best-Effort). Clientes Enterprise vão para Filas Dedicadas (SLA High). Assim, o abuso do plano Free nunca derruba o job do plano pago.

## 4. Evasão de Billing (Cartão Virtual Inválido / Chargebacks)

**O Cenário:**
Uma empresa cria uma conta com um cartão de crédito virtual (VCC) descartável. Faz upgrade para o plano Pro, importa dados, usa o sistema e logo depois apaga o VCC, gerando chargeback ou falha de faturamento no Stripe no final do mês. Em seguida, cria outra conta grátis.
*   **Sintomas:** Aumento nas taxas de estorno (Chargeback Rates) e contas inadimplentes com uso massivo nos primeiros 15 dias.
*   **Mitigação:** Cobrança Antecipada (Pró-Rata Upfront). A feature não destrava enquanto a transação de "Settle" da adquirente não for finalizada. Restrição no uso de cartões pré-pagos e monitoramento ativo (via Stripe Radar). Suspensão da conta (`status = SUSPENDED`) em até 3 dias após faturamento falho para clientes novos.