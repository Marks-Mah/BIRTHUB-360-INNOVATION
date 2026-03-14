# Política de Relatórios Compartilhados Externamente

## 1. Escopo e Propósito
A exportação de dados analíticos, métricas de produtividade, ROI, incidentes e relatórios de auditoria do BirthHub360 pelos Tenants é fundamental para a governança corporativa e a prestação de contas.
No entanto, quando um relatório de desempenho ou um log de execução detalhado (ex: CSV de prompts e respostas de um agente legal) sai do ambiente seguro e autenticado da plataforma, o risco de vazamento acidental ou malicioso aumenta.

Esta política estabelece os controles de segurança obrigatórios para o compartilhamento de relatórios gerados pelo BirthHub360 para fora dos limites da conta do Tenant (ex: envio por e-mail para consultores externos, *board of directors* ou investidores).

## 2. Controles de Segurança Aplicados a Relatórios

### 2.1. Níveis de Exportação e Tipos de Arquivo
*   **Dados Agregados (Dashboards Executivos):** Relatórios de alto nível (ex: "Economizamos 500 horas com IA", "Gasto de R$ 5.000 em Tokens").
    *   **Formato Permitido:** PDF, Imagem (PNG) e Links Temporários Seguros.
    *   **Controle Principal:** Watermarking (Marca d'água) e Expiração.
*   **Dados Granulares (Logs, Transcrições de Chat, Tabelas Brutas):** Relatórios detalhados contendo o histórico de interações com a IA, que podem incluir PII ou segredos de negócio injetados nos prompts.
    *   **Formato Permitido:** CSV, JSON.
    *   **Controle Principal:** Criptografia, Bloqueio de Exportação por Perfil (RBAC) e Auditoria Imediata (Data Exfiltration Monitoring).

### 2.2. Watermarking Dinâmico (Marca d'Água)
Para desencorajar o vazamento (leaking) ou a falsificação de números por parte de um funcionário:
1.  Todo relatório em PDF gerado através do painel do BirthHub360 (seja de faturamento, ROI ou auditoria de segurança) receberá, compulsoriamente, uma marca d'água em todas as páginas.
2.  **Conteúdo da Marca:**
    *   Endereço de e-mail do usuário logado que gerou o arquivo.
    *   Data e hora exata da exportação (Timestamp UTC).
    *   Identificador único do Relatório (Hash ID) para verificação de autenticidade (anti-tampering).
3.  **Metadados:** O arquivo PDF também conterá metadados rastreáveis (Author, Creator Tool, Timestamp) embutidos no padrão do documento.

### 2.3. Links de Compartilhamento Temporário (Secure Links)
Em vez de baixar um PDF sensível e enviá-lo por e-mail (onde o controle é perdido para sempre), o BirthHub360 recomenda o uso de Links Seguros de Leitura (Read-Only Share Links).
1.  **Geração:** O Administrador gera um link único para um Dashboard específico (ex: Relatório de Custos Q3).
2.  **Expiração (TTL - Time to Live):** O link tem um prazo de validade configurável (padrão de 7 dias, máximo de 30 dias). Após esse período, o link morre e retorna erro 404/403.
3.  **Proteção de Acesso:** O administrador pode exigir uma senha (PIN) adicional para abrir o link, ou restringir a abertura do painel apenas a uma lista de e-mails específicos (autenticação via Magic Link/OTP no momento do clique, sem necessidade de a pessoa ter uma conta completa no BirthHub360).

### 2.4. Auditoria de Exportação (Logs de Risco)
*   **Registro Inalterável:** Cada clique no botão "Exportar CSV" ou "Gerar Link Compartilhável" gera um evento de auditoria (`REPORT_EXPORTED_EVENT`).
*   **Aviso de Segurança:** Se um usuário tentar exportar o arquivo "Chat History Completo" contendo mais de 10.000 linhas de dados não agregados, o sistema emitirá um alerta severo ao DPO ou Administrador Principal do Tenant: "O usuário X está exportando o histórico bruto da empresa. Verifique se isso está autorizado pela política DLP interna."

## 3. Responsabilidade do Tenant (Data Controller)
*   O BirthHub360 fornece as ferramentas (Watermarks, OTP, Expiração), mas não assume a responsabilidade civil ou legal caso um funcionário do Tenant faça download legal de um relatório e, subsequentemente, o anexe de forma insegura a um e-mail público.
*   Ao exportar qualquer dado granular, o Tenant aceita que o arquivo sai da jurisdição técnica e de proteção do BirthHub360, passando a ser regido exclusivamente pelas políticas de DLP e BYOD da própria empresa contratante.
