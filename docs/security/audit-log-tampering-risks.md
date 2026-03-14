# Risco de Adulteração de Logs de Auditoria (Audit Log Tampering) e Mitigação via Hashing Encadeado

A credibilidade de um sistema de Auditoria (Audit Trail) baseia-se na sua **imutabilidade e integridade**. Este documento foca nas ameaças internas (Inside Threats), especificamente quando um ator com altos privilégios (como um Database Administrator - DBA, ou um Super-Usuário do BirthHub360) tenta adulterar, apagar ou modificar registros históricos do log para encobrir rastros de fraudes, vazamento de dados (LGPD) ou abusos de sistema.

## 1. O Risco Central: "Quem Vigia os Vigilantes?" (The Admin Problem)

No BirthHub360, os logs de auditoria dos Tenants são mantidos em uma tabela centralizada (ex: `audit.global_logs`).

*   **Ameaça (Tampering):** Um atacante interno com acesso direto ao banco de dados executa uma instrução `UPDATE audit.global_logs SET action = 'user.login' WHERE event_id = '123' AND actor_id = 'meu_uuid'` (encobrindo, por exemplo, um `mass.export`).
*   **Ameaça (Deletion):** O atacante simplesmente roda `DELETE FROM audit.global_logs WHERE timestamp > NOW() - interval '1 hour'` destruindo a prova do seu ataque antes que o cliente do Tenant perceba a invasão.
*   **Impacto (Crítico):** Se o sistema não possuir prova criptográfica de que os logs foram ou não modificados, a auditoria perde seu valor forense perante a ANPD (Autoridade Nacional de Proteção de Dados), clientes Enterprise ou auditorias ISO 27001/SOC 2. O BirthHub360 perderia a confiança do mercado por não conseguir garantir o isolamento da trilha de eventos contra si próprio.

## 2. Abordagens Inadequadas e Falhas Frequentes
*   **Restrições no Nível de Aplicação:** Ocultar o botão "Deletar Log" na UI do Painel Administrativo ou bloquear a rota `DELETE /api/logs`. Isso protege contra o usuário da aplicação, mas não contra quem tem as credenciais do RDS (Banco de Dados).
*   **Triggers do Banco de Dados:** Adicionar um Trigger que lance uma exceção em qualquer operação de UPDATE/DELETE na tabela de logs. Isso previne adulterações acidentais, mas um DBA malicioso com permissões de `SUPERUSER` pode desabilitar o Trigger, alterar os dados, e reabilitá-lo (`ALTER TABLE audit.global_logs DISABLE TRIGGER ALL; ... ENABLE TRIGGER ALL;`).

## 3. A Solução Arquitetural: Hashing Encadeado (Chained Hashes / Blockchain-like Audit)

Para resolver definitivamente o problema da integridade contra ataques internos, a arquitetura do BirthHub360 adotará um mecanismo leve de **Encadeamento Criptográfico de Logs (Merkle Tree Simplificada ou Blockchain Sequencial)**.

### Como Funciona:
Cada novo registro de log (Linha B) inserido na tabela de auditoria armazenará um hash criptográfico seguro do seu próprio conteúdo **somado ao hash do registro anterior (Linha A)** daquele mesmo Tenant (ou Global).

1.  **Geração do Hash (Inserção):** O serviço (Log Writer/Queue Consumer) calcula o Hash (ex: SHA-256) no momento da gravação no banco, garantindo que o banco de dados não gere o hash internamente (o que evitaria confiança exclusiva no motor relacional).
2.  **Fórmula do Hash do Registro `N`:**
    `Hash(N) = SHA256( event_id_N + tenant_id_N + actor_id_N + action_N + payload_N + timestamp_N + Hash(N-1) )`
3.  **Persistência:** A coluna `previous_hash` e a coluna `current_hash` são salvas no banco de dados junto ao registro JSON/Relacional do evento.

### Mitigação Efetiva
*   **Contra Modificações (`UPDATE`):** Se o DBA malicioso alterar o payload do evento `N-5` (ex: mudar "Export" para "Login"), o Hash arquivado na coluna `current_hash` do registro `N-5` deixará de corresponder ao cálculo dos dados brutos. Se ele recalcular e atualizar o `current_hash` de `N-5`, o registro subsequente `N-4` (que continha o hash antigo na sua coluna `previous_hash`) estará quebrado, invalidando a cadeia a partir dali. Para adulterar sem ser detectado, o DBA precisaria recalcular e alterar *todos* os logs subsequentes até o registro atual (T=0) em milissegundos, antes que o Log Writer insira o próximo.
*   **Contra Exclusões (`DELETE`):** Se o DBA apagar o registro `N-5`, o registro `N-4` passará a apontar para um hash "órfão" que não existe mais na tabela como o `current_hash` de nenhum registro anterior. A cadeia se rompe e o buraco temporal é matematicamente inegável.

## 4. Auditoria de Verificação Contínua (Verification Job)

A mera presença dos hashes não resolve se ninguém conferir sua validade.
*   **Rotina Diária:** Um cronjob (isolado do banco de dados principal, rodando em um serviço com chaves criptográficas exclusivas) faz um scan diário sequencial (Cursor-based) nos logs das últimas 24h de todos os Tenants e recalcula a cadeia de hashes em memória RAM.
*   **Alerta de Adulteração (Tamper Alert):** Se o script detectar qualquer quebra da corrente (Hashes não baterem ou faltarem), ele emite um alarme `CRITICAL (SEV-0)` no PagerDuty, enviando relatórios para a equipe de Segurança da Informação (CISO) e Engenharia do BirthHub360, apontando o ID exato onde a adulteração iniciou e a janela de tempo estimada do ataque.