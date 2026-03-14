# Análise: "Auditoria da Auditoria" (Audit of Audit Logs)

Em sistemas de altíssima segurança (Compliance de Nível Bancário ou Governamental), a visualização dos logs de auditoria de um cliente não pode ser tratada de forma leviana. O princípio da "Auditoria da Auditoria" determina que: **"Quem observa o observador deve deixar rastros"**.

A tabela de eventos globais (ex: `audit.global_logs`) contém uma trilha sensível que mapeia todo o comportamento dos funcionários, do CEO aos administradores do Tenant. Se um administrador (que tem acesso irrestrito ao sistema do cliente) observar os logs secretamente para saber quem o está investigando, ou para espionar as horas de acesso de outro colega, o sistema deve registrar essa espionagem.

## 1. Quem Pode Ver os Audit Logs de um Tenant?
O acesso ao Endpoint de Auditoria (`GET /api/v1/audit-logs`) e à UI do "Painel de Eventos" é restrito estritamente a usuários portadores de perfis superiores.

*   **Permissão Necessária:** `role: admin` ou `role: owner` dentro da tabela de membros daquele Tenant específico.
*   **Controle de Acesso Baseado em Atributos (ABAC):** Para clientes Enterprise, além do Role, o sistema pode exigir uma Claim específica do JWT, ex: `permissions: ["audit_log:read"]`. Usuários como Editores ou Analistas Financeiros nunca têm acesso aos logs corporativos gerais.
*   **Membros do Suporte (BirthHub360 Staff):** Funcionários do BirthHub360 não têm acesso direto à UI de logs do cliente, a menos que tenham autorização de acesso via sistema de *Impersonation* temporário, que quebra o vidro (Break-glass) e gera notificações ao dono da conta.

## 2. Como o Acesso aos Logs é Logado
Para evitar que administradores leiam a trilha silenciosamente:

1.  **O Gatilho de Observação (View Event):**
    Toda vez que a rota da API de listagem de eventos de auditoria é consumida (`GET /api/v1/audit-logs` com qualquer filtro de data), a aplicação **DEVE** acionar um evento interno e lançar um novo registro no próprio Log de Auditoria.
2.  **Ação Registrada no Banco:**
    `action = 'audit_logs.viewed'` ou `action = 'audit_logs.exported'`
3.  **Recursividade Controlada e Anti-Loop:**
    Para evitar um loop infinito (onde logar o acesso à página de logs gera um log, que ao recarregar a página exibe esse novo log, alterando a data e gerando outro log ad infinitum), a interface deve usar debouncing ou agrupamento de sessões, garantindo que "visualização de logs pela mesma sessão nos últimos 15 minutos" conte como um único evento agrupado de leitura no banco.

## 3. Visualização "Silenciosa" vs. Exportação
*   **Visualização UI (Silenciosa):** Quando o administrador visualiza os últimos 50 eventos renderizados no painel do browser, o sistema loga o acesso, mas o Risco de Exfiltração é baixo.
*   **Exportação (Massive Exfiltration):** Se o Administrador clicar no botão "Exportar para CSV/JSON" (baixando milhões de linhas de toda a vida da organização), o sistema acionará um alerta `WARNING` no log (`audit_logs.exported`) e enviará um E-mail de Notificação (Alerta de Segurança) para *todos* os demais Owners do Tenant: *"O usuário [Nome] acabou de exportar os logs completos da sua organização"*. Isso inibe ataques internos por funcionários prestes a se desligarem da empresa.

## 4. O Acesso do Time Interno ao Banco (Database DBA)
A única pessoa no mundo com capacidade técnica de ler os logs *sem* passar pelas rotas da API que engatilham a "Auditoria da Auditoria" é o Database Administrator (DBA) conectando-se diretamente ao Amazon RDS PostgreSQL via VPN/Bastião.

*   Para cobrir esse flanco cego: O RDS obrigatoriamente roda com o módulo `pgaudit` (PostgreSQL Audit Extension) habilitado.
*   Toda consulta `SELECT` que o DBA roda manualmente contra o schema `audit` é registrada nativamente em nível de disco no CloudWatch Logs da AWS, fora do controle de deleção do próprio DBA. O time de SecOps monitora essas leituras diretamente na infraestrutura, fechando o cerco de 360 graus.