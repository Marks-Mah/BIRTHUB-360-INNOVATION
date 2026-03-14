# Plano de Rollback de Migração e Recuperação de Desastre (RTO 15 Minutos)

Este documento especifica os procedimentos de emergência (Disaster Recovery e Rollback) durante a janela de manutenção de implantação da arquitetura Multi-Tenant (Ciclo 2).

O objetivo de tempo de recuperação (Recovery Time Objective - RTO) máximo aceitável para restaurar a plataforma caso o Cut-over (Fase 3 da migração) falhe catastroficamente é de **15 Minutos**. Um RTO apertado como este exige táticas arquiteturais agressivas, e invalida o uso de "Restore from Snapshot" tradicional em bancos de dados grandes, que leva horas para montar o volume em cloud (EBS/Aurora).

## 1. O Problema do RTO em Grandes Bancos (Por que Snapshot Falha)
A restauração padrão via AWS RDS (Snapshot Restore) cria um *novo* cluster e inicia o processo de hidratação (Lazy Loading) do S3 para o disco EBS. Um banco de dados de 500GB pode demorar de 2 a 3 horas para se tornar performático e exigiria atualização de DNS, quebrando a meta de 15 minutos.

## 2. A Estratégia Adotada: Blue/Green Deployment no Nível de RDS (Failover)

Para atingir o RTO de 15 minutos, usaremos o recurso de **Amazon RDS Blue/Green Deployments** (ou Aurora Fast Clones / Replica Promotion) conjugado com a manutenção lógica.

### 2.1. Preparação (Pré-Downtime)
1.  **Criação do Ambiente Green (Clone):** Horas antes do Cut-over (Fase 3), um ambiente Green idêntico do RDS é criado. Ele sincroniza a replicação (Replication Lag próximo de zero) com o banco de produção (Blue).
2.  **Roteamento (PgBouncer/DNS Local):** As aplicações (Ainda no código antigo) continuam conectadas ao ambiente Blue.

### 2.2. A Janela de Manutenção (O Início do Risco)
1.  O tráfego externo é desligado na API Gateway (Manutenção).
2.  Os Workers de mensageria (RabbitMQ/SQS) são paralisados. As filas mantêm os webhooks/eventos em *Hold*.
3.  **Início da Mudança de Schema:** O script final aplica o `NOT NULL`, `CREATE INDEX` e `ENABLE RLS` diretamente no banco Blue (que passará a ser o Novo Produção).
4.  **Validação:** A equipe roda o Checklist Pós-Migração (`docs/database/post-migration-checklist.md`).

## 3. O Acionamento do Rollback (Condições de Falha)

O "Botão de Abortar" (Rollback) DEVE ser acionado imediatamente pelo Engenheiro Líder se:
*   Os scripts de constraint (ex: `ALTER COLUMN tenant_id SET NOT NULL`) falharem por violação de integridade ou estourarem o tempo (Lock Timeout de 5 minutos).
*   A validação identificar dados órfãos, deleção acidental, ou se os testes do RLS bloquearem os administradores.
*   A nova versão da API, após ligada em modo restrito, falhar mais de 5% de requisições de teste em ambiente real por causa de permissões.

## 4. O Processo de Reversão (O RTO de 15 Minutos)

Se o Abort foi decidido, a meta de 15 minutos começa a correr.

1.  **Rejeitar o Banco Blue Alterado (T=0 a T+3 min):** O banco de dados primário atual (Blue), que acabou de ter suas tabelas quebradas ou alteradas para RLS de forma incorreta, é considerado **Corrompido** e isolado da aplicação.
2.  **Promover o Banco Green (T+3 min a T+8 min):** A Réplica exata criada no Passo 2.1 (Green), que foi interrompida no exato milissegundo do desligamento da API (Portanto tem os dados perfeitos antes da migração falha), é promovida para **Banco Primário (Writer)**. Como ela já estava hidratada, a virada de *Read Replica* para *Master* leva cerca de 3 a 5 minutos no AWS Aurora/RDS.
3.  **Redirecionar Conexões (T+8 min a T+10 min):** Atualizar as configurações de CNAME/Endpoint do PgBouncer/API para apontar a aplicação para o "Novo" Banco Primário (O antigo Green).
4.  **Reverter Deploy da API (T+10 min a T+13 min):** Fazer o Rollback do Kubernetes (ECS/EKS Task Definition) ou reativar os contêineres antigos com a imagem Docker do "Ciclo 1" (Sem as lógicas de RLS).
5.  **Abrir Tráfego e Filas (T+13 min a T+15 min):** Religação do API Gateway e reativação dos Consumers das Filas de Jobs (Retomando os jobs em *Hold*).
6.  **Desativar Painel de Manutenção.** A plataforma volta a responder no modelo antigo sem perda de dados (pois estava desligada).

## 5. Pós-Mortem de Rollback
O banco de dados Blue que falhou é retido temporariamente para análise da causa raiz (RCA - Por que a migração quebrou?). O incidente é documentado e uma nova janela é planejada para o fim de semana seguinte com os scripts de *ALTER TABLE* ajustados.