# Política de Auditoria (LGPD Compliance - Art. 37)

Este documento define a política de auditoria de dados e rastreabilidade (Audit Logging) do BirthHub360, assegurando conformidade estrita com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018), especificamente no que tange ao registro das operações de tratamento de dados pessoais.

O Art. 37 da LGPD determina: *"O controlador e o operador devem manter registro das operações de tratamento de dados pessoais que realizarem, especialmente quando baseado no legítimo interesse."*

## 1. Escopo da Política
Esta política aplica-se a todos os serviços, APIs, bancos de dados, e rotinas de background do BirthHub360 que toquem, modifiquem, leiam ou deletem (CRUD) dados classificados como Dados Pessoais (PII - Personally Identifiable Information) ou Dados Pessoais Sensíveis.

## 2. Eventos Obrigatórios de Registro (O Que Logar?)
Para cumprir as exigências legais de prestação de contas (Accountability) e possibilitar a resposta a incidentes de segurança ou requisições da Autoridade Nacional de Proteção de Dados (ANPD), os seguintes eventos **devem obrigatoriamente** gerar uma entrada imutável no log de auditoria:

### 2.1. Acesso e Autenticação (Authentication/Authorization)
*   **Logins Bem-sucedidos e Falhos:** Tentativas de acesso à plataforma (Registrar `user_id`, IP de origem, timestamp, User-Agent e status do login).
*   **Trocas de Senha e Redefinições:** Solicitações de reset de credenciais.
*   **Atribuição e Revogação de Permissões:** Mudanças no nível de acesso de um usuário (ex: Promoção de `Viewer` para `Admin` dentro de um Tenant).

### 2.2. Tratamento de Dados Pessoais (Data Processing)
*   **Criação/Atualização (Write Operations):** Sempre que um registro contendo PII (ex: novo paciente, cliente final do tenant, novo funcionário) for inserido ou modificado no banco de dados. O log deve indicar *qual tabela* foi alterada e *qual usuário* realizou a ação, mas **NÃO deve conter o dado pessoal sensível em si (Payload Mascarado)**.
*   **Exclusão (Delete/Purge):** Exclusões lógicas (Soft Delete) ou físicas (Purge) de titulares de dados, em atendimento ao Direito de Apagamento (Art. 18, VI). O log é a prova de que a operação foi executada.
*   **Exportação em Massa (Mass Export/Read):** O acesso rotineiro de leitura (ex: visualizar o perfil de um usuário na tela) gera volume excessivo e pode ser opcional em planos básicos, **MAS** a exportação de relatórios (CSV/XLSX) contendo listas de PII ou acessos em massa via API geram logs obrigatórios categorizados como `DATA_EXPORT_EVENT`.

### 2.3. Ações Administrativas e de Sistema (System/Admin Actions)
*   **Acesso de Suporte (Impersonation):** Quando um funcionário de Suporte ou DBA do BirthHub360 acessar os dados de um Tenant (após devida autorização), um evento crítico `SUPPORT_ACCESS_GRANTED` deve ser registrado no log daquele Tenant.
*   **Alterações de Configuração de Segurança:** Mudanças nas políticas de retenção, chaves de API revogadas ou configuração de SSO/SAML do Tenant.

## 3. Formato do Log (O Que o Log DEVE Conter)
Cada evento de auditoria persistido no sistema deve aderir a um schema rígido (ex: JSON estruturado), contendo no mínimo:
*   `event_id`: Identificador único do log (UUID).
*   `tenant_id`: Para garantir o isolamento RLS e permitir a exportação para o cliente correto.
*   `actor_id`: Identidade de quem realizou a ação (UUID do usuário, "System", "Support_Agent").
*   `action`: O tipo da operação (ex: `user.login.failed`, `order.exported`, `member.deleted`).
*   `target_resource_id`: O ID do recurso afetado (se aplicável).
*   `timestamp`: Data e hora exata em UTC (ISO 8601).
*   `ip_address` & `user_agent`: Origem da requisição (obrigatório pelo Marco Civil da Internet no Brasil para logs de acesso).
*   *(Opcional/Mascarado)* `diff`: O que mudou (Apenas para campos não-sensíveis ou mascarados).

## 4. O Que NUNCA Logar (Anti-Patterns de Segurança)
Para evitar que o próprio sistema de logs se torne um repositório de vazamento de dados (Data Bleed):
*   Senhas em texto plano, Hashes de senha, Tokens de Sessão (JWT), ou Secrets de API.
*   Números de Cartão de Crédito (PCI-DSS) completos.
*   O conteúdo integral de Dados Pessoais Sensíveis (ex: Diagnósticos médicos, opiniões políticas, dados biométricos - Art. 5º, II da LGPD) submetidos pelo cliente. O log registra que "O recurso X foi atualizado", mas não "O diagnóstico mudou de X para Y".