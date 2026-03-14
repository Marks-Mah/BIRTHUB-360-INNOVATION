DIRETRIZ: EXECUTE A AUDITORIA DE TODAS AS TAREFAS DE UMA VEZ SÓ.
## 2. REGRAS ESTRITAS DE VALIDAÇÃO (A REGRA ANTI-MOCK)
A sua análise não se baseia naquilo que o CODEX diz que fez, mas naquilo que realmente existe no código.


* PROIBIDO MOCKS: Se encontrar dados estáticos (const user = {id: 1}), ficheiros vazios, // TODO, // FIXME, ou funções que retornam placeholders em vez de consultar a base de dados real ou a API externa, isso é uma FALHA CRÍTICA.
* QUALIDADE: Avalie o tratamento de erros (try/catch, Zod), a tipagem estrita do TypeScript (ausência de any), a performance (N+1 queries, paginação) e a segurança (RLS, SQL Injection, CORS, Paywalls).
## 3. SISTEMA DE AVALIAÇÃO E GOVERNAÇÃO
Para cada um dos 10 Ciclos, deverá fornecer um parecer final com os seguintes elementos:


1. Nota do Ciclo (0 a 10): Atribua uma classificação e explique detalhadamente o porquê dessa nota com base na qualidade e funcionalidade do código encontrado.
2. Estado de Governança (Bolinhas): Atualize o estado de cada ciclo/item avaliado usando EXCLUSIVAMENTE a seguinte escala:


   * 🔴 Vermelho: Item não criado ou completamente ausente.


   * 🔵 Azul: Código criado, mas aguarda a sua validação profunda (Estado inicial da auditoria).


   * 🟡 Amarelo: Validado com melhorias (Tem mocks, bugs, falta de segurança ou não cumpre os requisitos a 100%. Exige refatorização pelo CODEX).


   * 🟢 Verde: Pronto e Perfeito (Código real, testado, funcional e em produção).


📋 LISTA DE ITENS PARA AUDITORIA (1000 TAREFAS DESTE CICLO)


   * Atenção Jules: Procure pela implementação REAL de cada um destes itens no repositório.


🔵 1.1.C1: Criar Turborepo com apps/web, apps/api e apps/worker configurados (pnpm).
🔵 1.1.J1: Escrever ADR-001: Escolha do Monorepo Tooling (Turborepo vs Nx).
🔵 1.1.C2: Configurar tsconfig base com strict mode e paths de importação.
🔵 1.1.J2: Definir estratégia de TypeScript: níveis de strictness.
🔵 1.1.C3: Configurar eslint com plugins typescript e import-order.
🔵 1.1.J3: Estabelecer documentação de regras de Linting e Formatação.
🔵 1.1.C4: Configurar prettier com regras compartilhadas.
🔵 1.1.J4: Definir arquitetura de pastas padrão para Node.js/Next.js.
🔵 1.1.C5: Criar script raiz dev que sobe apps em paralelo via Turbo.
🔵 1.1.J5: Validar PR do CODEX da Fase 1.1.
🔵 1.2.C1: Criar workflow GitHub Actions CI (lint, typecheck, test, build).
🔵 1.2.J1: Escrever ADR-002: Estratégia de CI/CD e Proteção de Branch.
🔵 1.2.C2: Configurar cache de dependências do Turbo no CI.
🔵 1.2.J2: Definir SLA de tempo máximo de execução do CI (< 5 min).
🔵 1.2.C3: Adicionar gitleaks ao CI como gate bloqueante.
🔵 1.2.J3: Estabelecer catálogo de ferramentas SAST (Semgrep, Gitleaks).
🔵 1.2.C4: Configurar branch protection rules (require PR, CI green).
🔵 1.2.J4: Criar matriz de tolerância a vulnerabilidades (Zero-tolerance).
🔵 1.2.C5: Criar workflow de CI separado para security scan.
🔵 1.2.J5: Validar PR do CODEX da Fase 1.2.
🔵 1.3.C1: Implementar logger estruturado pino com requestId, tenantId.
🔵 1.3.J1: Escrever ADR-003: Padrão de Observabilidade e Traceabilidade.
🔵 1.3.C2: Integrar Sentry em apps/web (client-side errors).
🔵 1.3.J2: Definir formato obrigatório do payload de Log em JSON.
🔵 1.3.C3: Integrar Sentry em apps/api (exceções não tratadas).
🔵 1.3.J3: Estabelecer política de Data Masking/Redaction em logs.
🔵 1.3.C4: Instalar OpenTelemetry SDK no API (HTTP/Prisma).
🔵 1.3.J4: Definir propagação de Request ID via AsyncLocalStorage.
🔵 1.3.C5: Criar middleware de correlação propagando requestId.
🔵 1.3.J5: Validar PR do CODEX da Fase 1.3.
🔵 1.4.C1: Validação Zod de env vars do API (api.config.ts).
🔵 1.4.J1: Escrever ADR-004: Gestão Estrita de Variáveis de Ambiente.
🔵 1.4.C2: Validação Zod de env vars do Next.js (web.config.ts).
🔵 1.4.J2: Mapear lista mestra de Variáveis de Ambiente necessárias.
🔵 1.4.C3: Validação Zod de env vars do Worker (worker.config.ts).
🔵 1.4.J3: Definir padrão de injeção segura NEXT_PUBLIC_.
🔵 1.4.C4: Criar .env.example completo e documentado.
🔵 1.4.J4: Definir estratégia de manuseio do .env.example.
🔵 1.4.C5: Implementar startup validation fail-fast nas env vars.
🔵 1.4.J5: Validar PR do CODEX da Fase 1.4.
🔵 1.5.C1: Configurar security headers no Next.js (HSTS, CSP).
🔵 1.5.J1: Escrever ADR-005: Políticas de CORS e Headers.
🔵 1.5.C2: Configurar CORS restrito com allowlist na API.
🔵 1.5.J2: Definir CSP base para aplicação Web.
🔵 1.5.C3: Implementar rate limiting por IP (429 Retry-After).
🔵 1.5.J3: Estruturar regras de Rate Limiting por tier.
🔵 1.5.C4: Adicionar helmet ao API e sanitizar inputs.
🔵 1.5.J4: Definir política estrita Content-Type (app/json).
🔵 1.5.C5: Middleware validando Content-Type rejeitando outros payloads.
🔵 1.5.J5: Validar PR do CODEX da Fase 1.5.
🔵 1.6.C1: Configurar Postgres docker-compose com healthcheck.
🔵 1.6.J1: Escrever ADR-006: Escolha do Banco de Dados (Postgres/Prisma).
🔵 1.6.C2: Criar schema Prisma inicial (User, Org, Session).
🔵 1.6.J2: Definir padrões de modelagem (CUIDv2, timestamps).
🔵 1.6.C3: Criar primeira migration e validar rollback.
🔵 1.6.J3: Desenhar diagrama ERD inicial.
🔵 1.6.C4: Criar seed.ts com 2 Orgs, 3 users e roles.
🔵 1.6.J4: Estabelecer política inalterável de Migrations e Seed.
🔵 1.6.C5: Configurar Prisma client singleton para HMR.
🔵 1.6.J5: Validar PR do CODEX da Fase 1.6.
🔵 1.7.C1: Implementar formato de erro RFC 7807 (Problem Details).
🔵 1.7.J1: Escrever ADR-007: Padronização de Respostas de Erro.
🔵 1.7.C2: Criar DTOs Zod/class-validator nos endpoints de mutação.
🔵 1.7.J2: Definir padrão arquitetural (Layered Arch).
🔵 1.7.C3: Implementar request context middleware (tenant/user id).
🔵 1.7.J3: Especificar injeção/leitura do Request Context.
🔵 1.7.C4: Configurar Swagger/OpenAPI com exemplos request/response.
🔵 1.7.J4: Definir escopo obrigatório OpenAPI/Swagger.
🔵 1.7.C5: Criar endpoint de health check (DB, Redis).
🔵 1.7.J5: Validar PR do CODEX da Fase 1.7.
🔵 1.8.C1: Criar teste smoke API (/health = 200).
🔵 1.8.J1: Escrever ADR-008: Estratégia de Teste (Vitest, RTL).
🔵 1.8.C2: Criar teste smoke web (login page renders).
🔵 1.8.J2: Regras estritas de isolamento DB em testes paralelos.
🔵 1.8.C3: Configurar banco teste isolado com seed auto (testcontainers).
🔵 1.8.J3: Especificar Test Coverage Target (>80%).
🔵 1.8.C4: Criar factory functions de teste User/Org.
🔵 1.8.J4: Definir política de flaky tests.
🔵 1.8.C5: Garantir testes rodando em paralelo no CI sem estado compartilhado.
🔵 1.8.J5: Definir nomenclatura de testes (Given-When-Then).
🔵 1.9.C1: Docs Swagger acessível dinamicamente no Dev.
🔵 1.9.J1: Criar docs/OPERATIONS.md (deploy, rollback, incidentes).
🔵 1.9.C2: Script bash setup-local.sh automatizado.
🔵 1.9.J2: Escrever docs/ONBOARDING.md.
🔵 1.9.C3: Criar docs/ARCHITECTURE.md com diagrama Mermaid.
🔵 1.9.J3: Estruturar TOC visual no README.md raiz.
🔵 1.9.C4: Config README com badges CI e links essenciais.
🔵 1.9.J4: Documentar matriz apps/ responsabilidades (Web/API/Worker).
🔵 1.9.C5: Script bash reset-local.sh formatando DB rápido.
🔵 1.9.J5: Validar PR do CODEX da Fase 1.9.
🔵 1.10.C1: Criar CHECKLIST_MASTER.md do Ciclo 1.
🔵 1.10.J1: Revisar CHECKLIST_MASTER.md checando provas.
🔵 1.10.C2: Criar CHECKLIST_LOG.md.
🔵 1.10.J2: Auditoria de Segurança Estática final no código.
🔵 1.10.C3: Referenciar ADRs Jules no código fonte via JSDoc.
🔵 1.10.J3: Code Review profundo atestando cumprimento de ADRs.
🔵 1.10.C4: Evidência Terminal Smoke Tests 100% green.
🔵 1.10.J4: Avaliar Evidência Smoke Tests anexada.
🔵 1.10.C5: Validação setup-local.sh em máquina limpa real.
🔵 1.10.J5: Assinatura de Fechamento Fase 1.
🔵 2.1.C1: Adicionar tenantId obrigatório com index nas tabelas Prisma.
🔵 2.1.J1: Escrever ADR-009: Estratégia Multi-tenant (Shared DB).
🔵 2.1.C2: Criar BaseRepository forçando tenantId `where` clause.
🔵 2.1.J2: Definir proibição de injeção de tenant via Controller.
🔵 2.1.C3: Middleware Contexto injetando tenant via AsyncLocalStorage.
🔵 2.1.J3: Regras validação criptográfica do x-tenant-id header.
🔵 2.1.C4: Testes unitários falhando query isolada sem tenantId.
🔵 2.1.J4: Criar checklist Code Review obrigatório (Anti-Cross-Tenant leak).
🔵 2.1.C5: Atualizar seed.ts com 2 tenants independentes isolados.
🔵 2.1.J5: Validar PR do CODEX da Fase 2.1.
🔵 2.2.C1: Indexes compostos [tenantId, id] em tabelas de grande volume.
🔵 2.2.J1: Listar Top 10 queries com risco de N+1 ou lentidão.
🔵 2.2.C2: Log de EXPLAIN ANALYZE nas queries listadas provando Index Scan.
🔵 2.2.J2: Definir política Index Composto (Leading column = tenantId).
🔵 2.2.C3: Query timeout default Prisma de 5s.
🔵 2.2.J3: Diretrizes proibindo Offset Pagination, exigindo Cursor-based.
🔵 2.2.C4: Teste performance: buscar 10k rows em < 100ms.
🔵 2.2.J4: Estratégia de tolerância Timeouts (Fail fast API vs Worker Relaxed).
🔵 2.2.C5: Migrar todos endpoints listagem para cursor-based no backend.
🔵 2.2.J5: Validar PR do CODEX da Fase 2.2.
🔵 2.3.C1: RLS policies nativas no Postgres Schema SQL.
🔵 2.3.J1: Escrever ADR-010: RLS em BD como Defense-in-Depth.
🔵 2.3.C2: Função Postgres get_current_tenant_id().
🔵 2.3.J2: Sintaxe SQL oficial de Policies por tenant documentada.
🔵 2.3.C3: Testes SQL RLS: Tentar bypass e assertar retorno vazio.
🔵 2.3.J3: Plano Bypass RLS documentado para seeds de admin.
🔵 2.3.C4: Docs habilitar/desabilitar RLS em dev environment.
🔵 2.3.J4: Documentar impacto overhead de latência do RLS e mitigações.
🔵 2.3.C5: FORCE ROW LEVEL SECURITY migration SQL gerada.
🔵 2.3.J5: Validar PR do CODEX da Fase 2.3.
🔵 2.4.C1: Fluxo criação de Organização na API (nome, slug, owner role).
🔵 2.4.J1: Diagrama UX Flow Onboarding (Criar vs Aceitar Invite).
🔵 2.4.C2: Sistema geração Token Convite com Mock Email Send.
🔵 2.4.J2: Segurança de Token (TTL 48h, one-time, crypto.randomBytes).
🔵 2.4.C3: Fluxo API trocar Tenant Ativo da Sessão do Usuário Multi-org.
🔵 2.4.J3: Regras UX purgação de estado React na troca de Tenant.
🔵 2.4.C4: Background Job limpando Convites expirados DB tabela.
🔵 2.4.J4: Plano teste Edge-case: invite pra usuário existente na plataforma.
🔵 2.4.C5: UI Settings gerência de Membros (Listar, Editar Roles, Apagar).
🔵 2.4.J5: Validar PR do CODEX da Fase 2.4.
🔵 2.5.C1: Tabela audit_logs JSONB fields.
🔵 2.5.J1: Escrever ADR-011: Audit Trail Desacoplada e Imutável.
🔵 2.5.C2: Decorator TS @Auditable aplicado nos Controller mutations.
🔵 2.5.J2: Estrutura mandatória do objeto Diff {before, after}.
🔵 2.5.C3: Worker Job flush Buffer Auditoria -> Banco via Batch array.
🔵 2.5.J3: Matriz indicando quais Ações exatas exigem Audit obrigatório.
🔵 2.5.C4: UI Frontend Listando Audit Trail e Filtros de Data.
🔵 2.5.J4: Política de expurgo Cold Storage S3 logs > 6 meses.
🔵 2.5.C5: Rota de API exportar os logs para formato CSV no Admin.
🔵 2.5.J5: Validar PR do CODEX da Fase 2.5.
🔵 2.6.C1: Tabela quota_usage rastreando uso limites do Tenant.
🔵 2.6.J1: Mapear catálogo de recursos limitáveis por Cota.
🔵 2.6.C2: QuotaService validando e incrementando uso atômico no BD.
🔵 2.6.J2: Regra de incremento atômico Prisma impedindo Race Condition limite.
🔵 2.6.C3: API HTTP 429 Status com JSON detalhando limit e current ao cliente.
🔵 2.6.J3: UX payload estruturado ExceededQuota com Upgrade Link.
🔵 2.6.C4: UI Painel Consumo Exibindo Gráficos uso atual vs Total da Cota.
🔵 2.6.J4: Definição comportamento jobs pendentes quando cota zera subitamente.
🔵 2.6.C5: Worker cron job reset de quotas virada do mês/dia.
🔵 2.6.J5: Validar PR do CODEX da Fase 2.6.
🔵 2.7.C1: Injetar attribute tenant.id spans OTel globalmente.
🔵 2.7.J1: Especificar taxonomia da string tenant.id nos APMs (Datadog/Grafana).
🔵 2.7.C2: Template Dashboard Prometheus/Grafana importável em JSON.
🔵 2.7.J2: Query de identificação do fenômeno "Noisy Neighbors" no Banco.
🔵 2.7.C3: Alerta Discord/Slack anomalia Tenant error rate > 10% baseline.
🔵 2.7.J3: Configuração dos Limiares/Thresholds matemáticos exatos de Warning.
🔵 2.7.C4: Endpoint prom-client métricas baseadas na rotulação de tenant.
🔵 2.7.J4: Arquitetura do OTel Sampler dinâmico 10% Sadio vs 100% Em Crise.
🔵 2.7.C5: Implementação de código do Sampler OTel mutável no código TS.
🔵 2.7.J5: Validar PR do CODEX da Fase 2.7.
🔵 2.8.C1: Escrever Suíte Isolamento (Vitest) invocando DB Tenant A vs B concorrente.
🔵 2.8.J1: Plano Testes E2E Isolamento Cross-Tenant Leakage Risk.
🔵 2.8.C2: Suíte de Isolamento de Cache Redis comprovando blindagem de keys.
🔵 2.8.J2: Especificar regra de empacotamento Redis Cache prefixing obrigatório.
🔵 2.8.C3: Suíte de Isolamento de Fila Worker cruzando contextos em BullMQ fake.
🔵 2.8.J3: Plano de Fuzzing injetando IDs sujos maliciosos nas APIs nativas.
🔵 2.8.C4: Testes de Fuzzing UUID codificados e passando na esteira verde CI.
🔵 2.8.J4: Critério Intransigente: Se 1 dado vazar pra org diferente, Reject PR.
🔵 2.8.C5: Action Isolation Suite configurado no yml forçando gate de bloqueio.
🔵 2.8.J5: Validar PR do CODEX da Fase 2.8.
🔵 2.9.C1: Ampliar Seed populando massivamente Workflows e Agentes no banco para estresse.
🔵 2.9.J1: Projetar Plano Arquitetural de Migração de Dados (Single para Multi-Tenant).
🔵 2.9.C2: Codar script bash reset-local.sh derrubando Volumes dev rapido < 30s.
🔵 2.9.J2: Estabelecer KPIs volumétricos para validação efetiva do Seed gerado.
🔵 2.9.C3: Script NodeJS de ETL varrendo schema velho DB injetando UUID Default Tenant.
🔵 2.9.J3: Impor regra de prevenção NODE_ENV em scripts drop DB locais.
🔵 2.9.C4: Testes regressivos garantindo integridade das chaves estrangeiras pós-ETL run.
🔵 2.9.J4: Criar Checklist QA Pós-Migração com os cheques vitais a executar no banco manual.
🔵 2.9.C5: Markdown docs explicando passo a passo de como rodar o comando ETL no servidor.
🔵 2.9.J5: Validar PR do CODEX da Fase 2.9.
🔵 2.10.C1: Evidenciar prints Relatório Isolamento Verde Zero Falhas de Vazamento.
🔵 2.10.J1: Emitir Laudo de Segurança Oficial (Blindagem de Cluster) baseando na evidência CODEX.
🔵 2.10.C2: Implementar fixes de código de refatoração mandados no review de Jules.
🔵 2.10.J2: Revisão Future-Proofing: A arquitetura DB restringe a Phase 6 de Workflows? (Aprovar/Revisar).
🔵 2.10.C3: Referenciar as ADRs no File System TypeScript via anotação JSDoc /** @see */.
🔵 2.10.J3: Checagem de dupla validação (Auditoria do Master Checklist do CODEX).
🔵 2.10.C4: Subir atualização CheckList de Conclusão do Novo Ciclo 1 Master.
🔵 2.10.J4: Validar na árvore de código se os JSDocs estão efetivamente visíveis e descritivos.
🔵 2.10.C5: EXPLAIN ANALYZE final print console evidenciando Index hits 100%.
🔵 2.10.J5: Assinatura de Arquitetura fechando Ciclo e liberando Auth/RBAC Start.
🔵 3.1.C1: Implementar Auth.js/Supabase real eliminando login mockado.
🔵 3.1.J1: Escrever ADR-010: Escolha Auth Provider (Auth.js vs Supabase).
🔵 3.1.C2: Remover stubs auth e repassar token real pros middlewares DB.
🔵 3.1.J2: Definir estratégia expiração (Access Token 15m, Refresh 7d).
🔵 3.1.C3: Testes de API forçando login, expiração e 401 Unauthorized errors.
🔵 3.1.J3: Fixar Cost Factor mínimo >=12 para Bcrypt nas specs Security.
🔵 3.1.C4: Logout Massivo Endpoint: Limpar toda tabela de sessões do UUID respectivo.
🔵 3.1.J4: Definir regras Introspection payload scopes para chamadas M2M de Worker.
🔵 3.1.C5: Criar Introspection Endpoint retornando permissões baseadas em Bearer API Key.
🔵 3.1.J5: Validar PR do CODEX da Fase 3.1 (Ateste 100% de remoção de mocks JSON).
🔵 3.2.C1: Setar flags obrigatórias HTTPOnly, Secure e SameSite Strict no gerador Cookies.
🔵 3.2.J1: Escrever ADR-011: Sessão em Cookies vs LocalStorage (XSS Mitigation).
🔵 3.2.C2: Logic Refresh Token Rotate. Apagar do DB e re-emitir no ato de uso pra previnir Theft.
🔵 3.2.J2: Definir política de Single/Multi device e revalidação de IPs drásticos de login.
🔵 3.2.C3: Global Logout Endpoint complementar desconectando devices roubados via DB Wipe.
🔵 3.2.J3: Documentar UX Rotation de tokens prevenindo loops de logout em múltiplas abas abertas.
🔵 3.2.C4: UI Next.js de Active Devices renderizando User-Agent limpos e botão Disconnect Device.
🔵 3.2.J4: Planejar schema de armazenamento DB das metadatas do User-Agent.
🔵 3.2.C5: Alerta envio e-mail EventBus para "New Login from Strange IP/Device".
🔵 3.2.J5: Validar PR do CODEX da Fase 3.2.
🔵 3.3.C1: Prisma Schema com enum Roles de negócio: OWNER, ADMIN, MEMBER, READONLY.
🔵 3.3.J1: Escrever ADR-012: RBAC base (Hierarquia estrita) versus ABAC.
🔵 3.3.C2: Decorator Middleware @RequireRole injetando barragem baseada no Auth Request.
🔵 3.3.J2: Matriz Regras Excel/MD mapeando as roles contra recursos.
🔵 3.3.C3: Lógica Permission Check Query impedindo cross-read de Roles dentro de arrays do Prisma.
🔵 3.3.J3: Configuração @RequireRole instruindo cache do Redis pra evitar gargalo BD Auth.
🔵 3.3.C4: Suíte Testes Mutáveis. Garantir HTTP 403 Forbidden em testes MEMBER testando rota ADMIN.
🔵 3.3.J4: Documentar Herança de Privilégios em Painel UI (Member no promote to Admin).
🔵 3.3.C5: UI Dropdown Settings Team permitindo Promoção/Rebaixamento de Cargo com confirmação.
🔵 3.3.J5: Validar PR do CODEX da Fase 3.3.
🔵 3.4.C1: Implementação lib otplib pra MFA TOTP Server e Render de QR Code buffer UI.
🔵 3.4.J1: Escrever ADR-013: Escolha MFA TOTP Nativo e recusa base de SMS Vulneráveis.
🔵 3.4.C2: Tolerância de Tempo drift = 1 step window na formula de match do TOTP App cliente.
🔵 3.4.J2: Definir regras 8 Recovery Codes HASH Bcrypt salvos, inutilizando plano.
🔵 3.4.C3: Geração Array 8 Strings de Recovery Codes com baixa colisão salvando só Hash BD.
🔵 3.4.J3: Projetar transição state-machine MFA-REQUIRED no login base.
🔵 3.4.C4: React Modal UX Guiado para Setup Onboarding MFA. 1: Lê, 2: Insere, 3: Salva Codes.
🔵 3.4.J4: Limitador estrito MFA Verify 3 erros maximos de preenchimento. Lockout de proteção.
🔵 3.4.C5: Intermediário de Auth. Se mfa Enabled, JWT Temporário gerado precisando rota /verify-mfa final.
🔵 3.4.J5: Validar PR do CODEX da Fase 3.4.
🔵 3.5.C1: UI Painel SuperAdmin permitindo Suspender, Banir e Edit Actions em Usuarios Gerais.
🔵 3.5.J1: Arquitetar estado Soft-Delete vs Hard-Drop pra não quebrar Relatórios de DB Foreign Key.
🔵 3.5.C2: Bloqueio Lógico API. Status=SUSPENDED no schema DB devolve imediato Account Block Login.
🔵 3.5.J2: Plano de Conformidade Expurgo LGPD (>90 dias Suspended obriga mascaramento PII).
🔵 3.5.C3: Mutações no Schema User lançam gatilhos no Worker gerando Log JSON Diff de Alteração A>B.
🔵 3.5.J3: Definir quais PII Masking rodam dentro do processo de Audit Trail.
🔵 3.5.C4: Worker CronJob "LGPD Cleanup" trocando e-mails reais por UUID@deleted.com se idles.
🔵 3.5.J4: Plano Script QA forçando remoção de account simulando preservação do log analítico isolado.
🔵 3.5.C5: Filtros na tabela Users Next.js passando Param search nativo da API em campos Nome/Email.
🔵 3.5.J5: Validar PR do CODEX da Fase 3.5.
🔵 3.6.C1: API Key Generator DB HashCrypto. Front UI avisa "A chave some, salve-a agora".
🔵 3.6.J1: Determinar ciclo de Vida M2M (Zero plano exposto pós-creation).
🔵 3.6.C2: DB Column enumArray Scopes[] atrelado ao modelo da APIKey e Validador no Middleware.
🔵 3.6.J2: Catálogo Documentado das Strings de Scopes publicas oferecidas pra M2M clients.
🔵 3.6.C3: Endpoint Rotate API Key botando old_key expirateAt = Date.Now + 24Hrs. Nova Imediata.
🔵 3.6.J3: Regra Funcional DownTime Zero nas chaves giratórias API via Soft Grace Period rules.
🔵 3.6.C4: Redis Limiter usando Key do DB ID API ao inves de IP, ampliando cota pra chamadas de Servidor Externo.
🔵 3.6.J4: Arquitetar desacoplamento de limiter de humanos UI versus limiter Máquinas M2M.
🔵 3.6.C5: Tela Dev Settings React mapeando APIKeys, copiando texto e Listando último Date de USO na tela.
🔵 3.6.J5: Validar PR do CODEX da Fase 3.6.
🔵 3.7.C1: Header de Content-Security-Policy-Report-Only na API coletando métrica violação externa XSS sem bloquear live.
🔵 3.7.J1: Projetar as diretivas Base do CSP blindando Framejacking com restrições 'self' e urls especificas aprovadas.
🔵 3.7.C2: Mecanismo de Prevenção a CSRF usando Double-Submit do Cookie custom se Framework Base falhar no suporte nativo CSRF.
🔵 3.7.J2: Design Padrão anti Cross Site Request Forgery compatível com a engine Next.js Actions atuais.
🔵 3.7.C3: Instalar DOMPurify rodando Parse obrigatório em Strings do React components Renderizando Markdown ou RichText Output de Agentes.
🔵 3.7.J3: Diretriz expressa obrigatória de Sanitização. Proibido dangerouslySetInnerHTML sem wrapper sanitizador provado.
🔵 3.7.C4: Express Route Validator lendo Origin Header verificando se bate perfeitamente com BASE_URL do .env nas mutações.
🔵 3.7.J4: Regras de Validação Origin OWASP contra spoofings HTTP em Mutações de State Crítico.
🔵 3.7.C5: Fuzzing QA Tester do Vitest submetendo Payload XSS de javascript puro em Body de Endpoints pra ver se Sanitizer engoliu.
🔵 3.7.J5: Validar PR do CODEX da Fase 3.7.
🔵 3.8.C1: Classe JobContext base em /core formatando a regra onde todo payload BullMQ contém tenantId imutável e jobId.
🔵 3.8.J1: Definir modelo Payload Interface que erradica "Jobs Fantasmas / Orfãos" de dono rastreavel dentro do Redis do Worker.
🔵 3.8.C2: Processor MiddleWare (Worker) lendo DB/Redis validando TenantID antes da lógica de negócio rodar o código do processo assíncrono.
🔵 3.8.J2: Regras arquitetura de Guard Intrasservers assegurando o Lock do Request Context de isolamento da Fase 2 dentro do Job Background.
🔵 3.8.C3: Teste Unitário Queues inserindo job modificado de forma forjada pra conferir Drop Silencioso na Fila com emissão Alert Critical ao logger.
🔵 3.8.J3: Política de Criptografia BullMQ. Configuração de Signed Payloads HMAC usando Key privada contra injeções Redis Diretas hackers.
🔵 3.8.C4: Adicionar SHA256 Signature no construtor de Push da BullMQ garantindo que worker só lida com mensages com Hash Match válido.
🔵 3.8.J4: Planificação da Fallback Execution onde Job falsificado / Signature mismatch resulta em P1 Alert Ops e Failed Dead Letter status.
🔵 3.8.C5: Endpoint Admin listagem e cancelamento de active jobs BullMQ de um tenant que explodiu limite via bug.
🔵 3.8.J5: Validar PR do CODEX da Fase 3.8.
🔵 3.9.C1: Arquivo .yml de Github Workflow implementando rules Semgrep focadas em falhas Typescript (ex: Eval usage warning).
🔵 3.9.J1: Definir as Custom Rulesets do Semgrep a serem ativas no check de CI do Repo para SAST profundo na codebase.
🔵 3.9.C2: Workflow Dependency Scanner pnpm audit configurado quebrando a build apenas se a vulnerabilidade for HIGH/CRITICAL e não-devDependência.
🔵 3.9.J2: Criar Matrix Baseline NPM Audit estabelecendo bloqueio imediato contra vulnerabilidades severity de impacto real produtivo na esteira.
🔵 3.9.C3: Bateria completa Vitest RBAC percorrendo Todas Roles base vs Todos Endpoints Mutações atestando recusa 403 Forbidden.
🔵 3.9.J3: Documentar padrão Coverage CI. Testes RBAC tem coverage requirement de 100% de Pass para Merge Approvals nas rotinas Devs da empresa.
🔵 3.9.C4: Setup e Docker run efêmero do OWASP ZAP spider scan testando as urls documentadas Swagger do backend pra identificar Open Ports inseguras.
🔵 3.9.J4: Elaborar escopo Scan OWASP. Frequência DAST e os flags falsos positivos tolerados pela equipe no painel CI Reports.
🔵 3.9.C5: Gerador de Report Consolidado Markdown via Action agregando Coverage e Scanners numa issue automatica antes do fechamento PR.
🔵 3.9.J5: Validar PR do CODEX da Fase 3.9.
🔵 3.10.C1: Efetuar fix de qualquer apontamento HIGH recebido pelo scan baseline e commitar no report provando Green.
🔵 3.10.J1: Fechar Reunião / Issue de segurança atestando Mitigação completa de M2M Tokens, OWASP e Limites Base.
🔵 3.10.C2: Apensar Report de Cobertura 100% dos Guards RBAC no PR garantindo blindagem.
🔵 3.10.J2: Avaliar e dar o Green Check Coverage oficial no repo atestando que Decorator Guard cobre a totalidade do App vivo API.
🔵 3.10.C3: Inserir /** @see ADR-010 */ JSDoc annotations nas pastas Core documentando referências de design do Arquiteto no código TS.
🔵 3.10.J3: Averiguar adequação de Codebase às diretrizes formatadas na Arquitetura de Auth definidas no Root do Ciclo.
🔵 3.10.C4: Checagem Linter final proibindo Controller Methods sem a tag Decorator de Segurança de role.
🔵 3.10.J4: Busca AST nas rotas Express/Nest atestando zero rotas fantasma ou orfãs sem Auth Barrier.
🔵 3.10.C5: Output PDF OWASP ZAP Result Clean no final da Sprint.
🔵 3.10.J5: Assinar Fase Auth e RBAC concluída e Start de Ciclo Core AI Engine.
🔵 4.1.C1: Package Typescript interno (packages/agents-core/src/types) abrigando interfaces estritas Agent, Tool, Skill, Policy.
🔵 4.1.J1: ADR-014 Escrita: Motivos técnicos de rejeitar langchain monolítico em favor do Engine Próprio leve focado no Workflow e Tools Typescript.
🔵 4.1.C2: Objeto Zod AgentManifest estrito. `z.object().strict()` validando `version`, `tools array`, `system_prompt` barrando payload extra sujo.
🔵 4.1.J2: Documentar as especificações de campo chave que não podem faltar nunca na constituição do Manifest JSON de Ingestão do Registry.
🔵 4.1.C3: Parser Wrapper em volta do Zod. Captura ZodErrors da ingestão e converte os Paths `{ field: "tools.1", msg: "Invalid Type" }` para Frontend Error Toast legível humano.
🔵 4.1.J3: Exigir mapeamento Error Handling UX Friendly na UI Studio pra devs e admins de pack não sofrerem debugando log sujo.
🔵 4.1.C4: Suíte Unit Testing Manifest Parser. Mock JSON perfeito, JSON missing field, JSON Types errados. Todos Assertando a devolução ou Crash com Error especifico Zod.
🔵 4.1.J4: Arquitetar o Design System de Workspace: Isolamento do pacote agents-core pra que não herde Prisma imports (Manter puramente Logic CPU Layer TS puro).
🔵 4.1.C5: tsup / typescript build commands integrados ao package.json do core gerando doc automática do código com Typedoc pros contribuidores internos da empresa.
🔵 4.1.J5: Validar PR do CODEX da Fase 4.1.
🔵 4.2.C1: Prisma Schema AgentVersion Table + Controller CRUD de criação e atualização de Pacotes IA internos vinculados a um Agent Master.
🔵 4.2.J1: Estabelecer SemVer Rules e regras restritivas do Lifecycle: Um AgentVersion Published não pode ser apagado, apenas marcado como Deprecated e substituto criado.
🔵 4.2.C2: Injeção de lógica de Validação SemVer pacote NodeJS checando o Bump de versões no Create e impondo o texto Changelog mandatório do banco se for minor/major.
🔵 4.2.J2: Documentar exigência da integridade de Dados Digest HASH SHA-256 no Postgres gravando Payload cru de Prompts no ato de insert para blindagem forense.
🔵 4.2.C3: Lógica Node.js Crypto.createHash processando System Prompt text em SHA256 string salvando na coluna 'digest' da versão criada contra alteracao db admin injection direct.
🔵 4.2.J3: Regra funcional estrita: O Workflow de Rollback reativa versões inativadas, adicionando Registro novo de auditoria pro Agent Manager.
🔵 4.2.C4: Rota de Fetch paginada Cursor-Based API do AgentRegistry fazendo text query match sobre arrays de tags, labels do prompt JSON e indexação status = PUBLISHED.
🔵 4.2.J4: Configurar esquema Search Indexing de busca text PostgreSQL Full-Text Search otimizado na busca por categoria de Agente no catálogo.
🔵 4.2.C5: Endpoint de Rollback Version. Inativa a versao V2 (Latest) e reestabelece Flag IsActive = true da V1 emitindo Auditable Decorator log pro admin Dashboard Logs.
🔵 4.2.J5: Validar PR do CODEX da Fase 4.2.
🔵 4.3.C1: Injeção de workers no BullMQ definindo Queues: Agent_High (Webhook triggers on the fly), Normal e Low (Background Report crons) provisionados e amarrados no Worker Node instance global.
🔵 4.3.J1: Projetar arquitetura hierárquica QoS Queue System pra não prender resposta sincrona web API por conta de batches de agent de report diário demorado de madrugada nos canais.
🔵 4.3.C2: Code da Engine Base PlanExecutor.TS instanciando loop principal: 1. Chama OpenAI/LLM > 2. Recebe Tool_Call object > 3. Executa Array Tool Actions > 4. Re-alimenta LLM Prompt Context recursivamente.
🔵 4.3.J2: Desenhar Machine State da Engine. Como será o Parse final se o LLM parar no step de MaxTokens output limit. E os fallbacks de connection do LLM service provider falho external request.
🔵 4.3.C3: Redis SETNX Distributed Lock atrelado a JobId e Tenant antes de dar Start Worker Process impedindo Side-Effects de email enviados Duas vezes se a thread der blink instabilidade node host.
🔵 4.3.J3: Impor regras inegociáveis de Idempotência. Exigir cache lock Redis validando status do Job antes e gravando success flag pós execução terminada com garantia banco.
🔵 4.3.C4: Jitter Randomization e Exponential Backoff BullMQ options config setup. Max tentativas 5 pra contornar rate-limit do OpenAI ou Server timeout providers 5xx.
🔵 4.3.J4: Limitação Teto Jitter Backoffs em Tool Engine para salvação de Timeouts e não ficar loop retry infinito drenando grana de budget AWS cloud infra server billing credit costs limits.
🔵 4.3.C5: Event Listener de SIGINT / SIGTERM rodando `await queue.close(5000)` e drain jobs em memória do container docker antes do NodeJS ser killed pelo Kubernetes ou ECS fargate infra stop signal commands.
🔵 4.3.J5: Validar PR do CODEX da Fase 4.3.
🔵 4.4.C1: AgentMemory CRUD Redis Class namespace hardcoded string "tenantId:agentId:sessionId:key" prevenindo cruzamento na Key Value Store nos contextos multi org.
🔵 4.4.J1: Determinar DB Storage de Curto Prazo vs Longo Prazo do agente (Memória Efêmera Conversation History via Redis Expire).
🔵 4.4.C2: ConversationContext Schema Array gravando Messages [{role, content}] anexadas de config de TTL dinâmico lido do manifesto do pacote agent configurado.
🔵 4.4.J2: Regra Compressão de Tokens Matemáticos. Estabelecer cortes de Head Messages quando Context Window hitar Maximum Teto OpenAI GPT-4 tokens request size budget limit limits.
🔵 4.4.C3: PII Regex Redaction Interceptor. Modifica "CPF 000.000.00" -> "[REDACTED]" antes de commitar log history pro Banco de Dados preservando segredo cliente nos Logs.
🔵 4.4.J3: Documentar Lista Padrão de PII (Cartões, Social Security, E-mails) exigindo injeção do Regex Filter Obligatory antes de escrita banco nos pacotes de Logs Core Logging.
🔵 4.4.C4: Rota DELETE wipe. API Wipe All Context Memory /agents/ID/memory. Limpa as keys Redis baseadas no Pattern SCAN MATCH da chave específica.
🔵 4.4.J4: Orientar Expurgo em Cascata. Delete Org = Drop no pattern Redis Memory global pra não ter Ghost RAM consumption data bill charges do servidor.
🔵 4.4.C5: Context Compresion TS. Verifica String Size estimado do Array Messages. Se > limite, Pop() nas posições 1 e 2 array preservando Position 0 [System Prompt inviolável].
🔵 4.4.J5: Validar PR do CODEX da Fase 4.4.
🔵 4.5.C1: BaseTool Abstract Class. `name`, `description`, `inputSchema Zod`, `outputSchema Zod`, e `execute() Promise` method obrigatórios pra herança OOP Typescript nas novas tools engine core module.
🔵 4.5.J1: Escrever ADR-015: Sandbox Defenses e Tool Security Models pra barrar SSRF em requests vindas livremente via LLM hallucination injeção.
🔵 4.5.C2: HTTP Tool Fetch com regex validador contra URLs host. Blacklist `localhost`, `10.x`, `192.x` resolvendo o hostname antes da query efetivamente ser chamada, Dropando requests SSRF com throw BlockedIp.
🔵 4.5.J2: Contract Object Oriented spec BaseTool requirement guidelines, assegurando padronização total para desenvolvedor open-source da comunidade plugar novas tools fácil.
🔵 4.5.C3: Tool DB-Read injetando o escopo TenantID do Node Server implicitamente na cláusula Prisma ignorando possíveis "tenant_id: 2" perigosos recebidos do JSON GPT Payload GPT args hallucination param injections.
🔵 4.5.J3: BlackList DNS Hostname resolvido nas tools HTTP obrigatória, fechando CNAME spoofing de Cloud Services Metadata API amazon hacker leaks risks protection shield.
🔵 4.5.C4: DB-Write Mutation Tool exigindo disparo EventBus de @Auditable log actions para qualquer modificação gerada na base via instrução de IA autonoma da plataforma web API node server logic action.
🔵 4.5.J4: DB-Write Tool Audit Trail enforcement Spec. Injeção forçada garantida antes de salvar row nova.
🔵 4.5.C5: SendGrid Mail Tool consumindo Secrets Manager env e recebendo "To, Subject, HTML" via param do LLM enviando e-mail transacional limpo via connector library module Node.JS API.
🔵 4.5.J5: Validar PR do CODEX da Fase 4.5.
🔵 4.6.C1: PolicyEngine Class `evaluate()`. Checa as Permissões salvas no Banco contra a requisição Tool Call da IA (ex: Tool.Email liberada?). Retorna { granted: boolean, reason: str }.
🔵 4.6.J1: Engine Architect Default-Deny Concept. Tudo negado, exceto Allowed configs salvas expressamente por Org Admin no DB painel front.
🔵 4.6.C2: BaseTool Interceptor invocando PolicyEngine antes do `execute`. Se falhar, throw `PolicyDeniedError` cortando I/O imediatamente e salvando string de Log Fail na memória do Agente.
🔵 4.6.J2: Tratar Exceção Default como Feedback Prompted para o LLM. A Engine pega erro e diz pro bot: "Sua ação xpto foi bloqueada, tente outro caminho", não mata toda run crash loop node process app.
🔵 4.6.C3: React UI Page /agents/[id]/policies com Checkboxes (Toggles Switch UI) ligando/desligando ferramentas e capacidades do Agent para aquele tenant isolado no Dashboard Admin Web App NextJs frontend app routes.
🔵 4.6.J3: UX Wireframes guidelines pro Policy Control Panel. Visual Switches intuitivos de Features Permissões.
🔵 4.6.C4: Bateria Test Unit Vitest testando matriz Deny vs Allow forçando retorno Exception assertada no TryCatch do Runner Validator Mock function call.
🔵 4.6.J4: Default Policy Profiles Templates doc config list (ReadOnly role = deny all CUD methods tool operations, Admin = Allow All trust tool actions).
🔵 4.6.C5: Preset Template Injection na Factory do Registry. Cria templates "ReadOnly" (Sem DB-Write) e "Standard" defaults out of box na criação nova do Agente.
🔵 4.6.J5: Validar PR do CODEX da Fase 4.6.
🔵 4.7.C1: /agents React NextJs Page Listando Tabela UI com Metrics (Fail Rate, Last_run data param, Status).
🔵 4.7.J1: Agent Studio Layout e UX Guidelines Design Doc Mapeando Overview tab Dashboard Metrics Visuais pro admin de Ops.
🔵 4.7.C2: /agents/[id] Layout complexo com Nested Layout e Tabs Radix/Tailwind: (Overview | Executions | Logs | Manifest).
🔵 4.7.J2: Regras Editor Diff visual color codes. Added green, deleted red lines view text comparison component rules specification layout base.
🔵 4.7.C3: Integrar Monaco/CodeMirror gerando Diff Editor exibindo Json Manifest V1 x V2 lado a lado com Syntax Highlight.
🔵 4.7.J3: SSE Streaming Architecture Route Planner design document pra render manual test chat text streams via API to UI without long polling delays overhead on Node Servers architecture base model API Gateway design constraints server configs web.
🔵 4.7.C4: /run UI Chat Input form chamando Rota de Server-Sent Events (SSE). Listener recebe Chunks parciais (Stream) do Worker e joga em componente React live UI text writer box type effect.
🔵 4.7.J4: Run Filters paginator rules pra Execution tab DB queries requirements list specs on Dashboard Studio.
🔵 4.7.C5: Paginator Componente UI e Prisma offset/cursor query para Listagem das Runs Ativas na aba Executions do Front Filtrado por OK/Failed/Running.
🔵 4.7.J5: Validar PR do CODEX da Fase 4.7.
🔵 4.8.C1: Hook Timer ms do Node Process capturando Latency Execution e Tool Cost Counter pra consolidar em Tabela AgentMetrics Dashboard Prisma Save Actions on job done signal Event.
🔵 4.8.J1: Lista Oficial de SLIs de Agents (P95 Latency, Fail Rate absolute % threshold count limits, LLM Token Cost Tracking formulas math logic).
🔵 4.8.C2: Painel Grafico UI Recharts com barra uso Agente A vs Agente B Custos totais Tenant Level dashboard views React.
🔵 4.8.J2: JSON Schema Template Grafana Dashboard import settings file config pro Time Ops cloud observability.
🔵 4.8.C3: EventBus Worker Dispara Email Action caso Job Metrics detecte Fail Rate array window ultima hora > 20% em um unico agent id report.
🔵 4.8.J3: Threshold Alerting Specs. Alarme se Agent X falha muito em curto espaço de tempo Alert trigger config spec rules.
🔵 4.8.C4: Open Telemetry Custom Span Injections rastreando "Agent_Init" -> "Plan_Gen" -> "Tool_Http_Run" conectando TraceId de ponta a ponta pra Tree view Datadog/Jaeger.
🔵 4.8.J4: OpenTelemetry Tree View Design spec de nomenclaturas pra facilitar Debugging E2E Visual Flow Ops tracing spans.
🔵 4.8.C5: API /agents/[id]/export. Stream response attachment formatando array metrics history num Blob CSV pro cliente manager abaixar Excel reports.
🔵 4.8.J5: Validar PR do CODEX da Fase 4.8.
🔵 4.9.C1: Unit Test Engine testando Multiplas regras de PolicyEngine avaliando sobreposição (Conflitos Role All Allow x Strict Deny).
🔵 4.9.J1: Test Matrix QA Specs (Hallucination injection tests, Timeout DB mock connections failure checks, Policy denied overrides rules test config).
🔵 4.9.C2: Suíte de Runtime Integração rodando PlanExecutor falso mock tools, assertando final da state machine com Output json ok e lock cache limpos pós teste.
🔵 4.9.J2: Cluster Load Test Blueprint Specifications (50 Heavy Executions concurrently in Redis BullMQ for OOM Memory crash verifications without dropping Web HTTP API 200 checks).
🔵 4.9.C3: Playwright Script Automation. Clica Botao Create Agent, digita Form, Add Tool Slack, Salva, Abre Run, Escreve Text, Clica Send, Wait Resposta live render.
🔵 4.9.J3: Instructions on Mock Factories for DB Isolation tests clean slate DB setup rules tests instances data mock gen.
🔵 4.9.C4: Benchmark Worker Script 50 items add queue array push. Measure Time End to End. Assert Latency DB não crachar pgbouncer.
🔵 4.9.J4: Block CI pipeline se Vitest Coverage na core-agents pkg for under 90%. Enforcement Rules config CI.
🔵 4.9.C5: AgentExecution Mock Builder. Função utilitária Typescript pra teste retornar Mock Object limpos instanciáveis em qualquer test file sem repetição massiva const JSON setup.
🔵 4.9.J5: Validar PR do CODEX da Fase 4.9.
🔵 4.10.C1: Print Console Terminal Evidencia Test Core Vitest Suite Results > 80% Coverage Green logs.
🔵 4.10.J1: Review Segurança Rigoroso. Avaliar brecha The LLM Prompt Hack de overrides do sys config injetado por usuários end clients no chat form form payload req.
🔵 4.10.C2: Aplicar Fixes mandados da auditoria estática de bugs C4 do JULES Code Review notes fix commit push merges actions ok done.
🔵 4.10.J2: Auditar Worker Timeout congelamento. Garantir q Timeout Exception da OAI Network nao quebra Pool Threads e paralisa queue global rest tenant flows execution processes app freeze blocks.
🔵 4.10.C3: JSDoc Annotation em Modules Core Linkando ADR Docs Git references specs code link tags comments done files.
🔵 4.10.J3: Checar JSDoc ADR annotations presença no Codebase core files review.
🔵 4.10.C4: Screenshot Metrics Server LoadTest result pass no deadlock pg connection error limit timeouts OK throughput result file add proof PR task.
🔵 4.10.J4: Review Coverage Target >=90% confirm coverage unit tests assert pass green gate lock.
🔵 4.10.C5: Print SSRF Bloqueio de rede Local Assert Exception Logs OK Test Pass evidence green mark cycle done lock ok.
🔵 4.10.J5: Emitir Assinatura e Documento Finalização Ciclo 4 Autorizando fase de Marketplace, Agents e Workflows.
🔵 5.1.C1: Criar packages/agent-packs/corporate-v1/ com estrutura manifest, prompts, config, tests.
🔵 5.1.J1: Escrever ADR-016: Modelo de Distribuição de Agentes (Monorepo Packs vs External Registry).
🔵 5.1.C2: Implementar script de validação de todos os manifests do catálogo no CI.
🔵 5.1.J2: Definir estrutura exata de arquivos requerida para um Agent Pack válido.
🔵 5.1.C3: Criar manifest JSON para CEO Agent Pack com skills e tools documentados.
🔵 5.1.J3: Estabelecer critérios de aceitação qualitativa para Manifests.
🔵 5.1.C4: Criar manifests JSON para CRO, CMO, CFO, CTO, COO Agent Packs.
🔵 5.1.J4: Planejar o fluxo do CI que roda o schema validator.
🔵 5.1.C5: Criar manifests JSON para Legal, RH, CS, Sales, Finance, Ops Agent Packs.
🔵 5.1.J5: Validar PR do CODEX da Fase 5.1 (Prompts/Manifests).
🔵 5.2.C1: Implementar sistema de tags em manifests: domain, level, persona, use-case.
🔵 5.2.J1: Definir taxonomia oficial (tags de indústrias e domains).
🔵 5.2.C2: Criar índice de busca full-text dos manifests com ranking por relevância.
🔵 5.2.J2: Escrever algoritmo de API Search Rank.
🔵 5.2.C3: Criar página de Agent Marketplace com filtros por tag, domain e level.
🔵 5.2.J3: Especificar o Marketplace UI Layout.
🔵 5.2.C4: Implementar sugestão de agentes baseada no perfil de uso do tenant.
🔵 5.2.J4: Desenhar lógica do Suggestion Engine.
🔵 5.2.C5: Criar API de busca de agentes com paginação e facets de filtro.
🔵 5.2.J5: Validar PR do CODEX da Fase 5.2.
🔵 5.3.C1: Criar skill template analyzer com outputSchema de score e insights.
🔵 5.3.J1: Definir regras do Analyzer Prompt.
🔵 5.3.C2: Criar skill template generator com outputSchema de artefato Markdown.
🔵 5.3.J2: Definir regras do Generator Prompt.
🔵 5.3.C3: Criar skill template monitor com outputSchema de alertas.
🔵 5.3.J3: Definir regras do Monitor Prompt.
🔵 5.3.C4: Criar skill template orchestrator que chama outros agentes em sequência.
🔵 5.3.J4: Arquitetar lógica do Orchestrator.
🔵 5.3.C5: Criar skill template reporter com outputSchema de relatório estruturado.
🔵 5.3.J5: Validar PR do CODEX da Fase 5.3.
🔵 5.4.C1: Criar tool de email estendida (SMTP/SendGrid) com retry e bounce handling.
🔵 5.4.J1: Especificar Email Tool Security/SMTP limits.
🔵 5.4.C2: Criar tool de slack via webhook e API usando OAuth2.
🔵 5.4.J2: Criar regras de OAuth Token Storage.
🔵 5.4.C3: Criar tool de CRM com adapter genérico para HubSpot e Salesforce.
🔵 5.4.J3: Especificar CRM Integration limits.
🔵 5.4.C4: Criar tool de storage com adapter S3/Supabase para output files longos.
🔵 5.4.J4: Especificar Storage Tool limits e quotas.
🔵 5.4.C5: Criar tool de calendar interagindo via Google Calendar e ICS.
🔵 5.4.J5: Validar PR do CODEX da Fase 5.4.
🔵 5.5.C1: Criar BudgetService verificando custo estimado e decrementando cota por tenant.
🔵 5.5.J1: Projetar FinOps Quota Enforcement design.
🔵 5.5.C2: Criar modo ExecutionMode.DRY_RUN simulando LLM sem custo real.
🔵 5.5.J2: Arquitetar DRY_RUN e isolamento de billing.
🔵 5.5.C3: Criar alerta de consumo: atingindo 80% do budget, notificar tenant admin.
🔵 5.5.J3: Definir regras de 80% Notification UX.
🔵 5.5.C4: Implementar estimativa de custo pré-execução lida dos tokens do manifest.
🔵 5.5.J4: Escrever Estimation Algorithm para tokens.
🔵 5.5.C5: Criar UI de orçamento por agente: configurar limite, histórico e CSV export.
🔵 5.5.J5: Validar PR do CODEX da Fase 5.5.
🔵 5.6.C1: Criar wizard multi-step de instalação (selecionar, preview, conector, ativar).
🔵 5.6.J1: Definir Wizard UX Steps (React Form).
🔵 5.6.C2: Implementar transação atômica no banco para instalação de packs (tudo ou nada).
🔵 5.6.J2: Especificar DB Transaction integrity rules.
🔵 5.6.C3: Criar desinstalação de pack limpando conectores e gravando audit trail.
🔵 5.6.J3: Criar Clean Uninstall policy.
🔵 5.6.C4: Criar tela de status dos packs instalados (active, degraded, failed).
🔵 5.6.J4: Documentar Degradation limits rules.
🔵 5.6.C5: Implementar alerta e botão de "Update to v2.0" de packs na UI.
🔵 5.6.J5: Validar PR do CODEX da Fase 5.6.
🔵 5.7.C1: Criar hash SHA256 de todo output de agente e salvar com o log de execução.
🔵 5.7.J1: Definir Output Hashing cryptography requirements.
🔵 5.7.C2: Implementar human-in-the-loop opcional (pausar para aprovação manual).
🔵 5.7.J2: Desenhar Human-in-loop flow state-machine.
🔵 5.7.C3: Criar cron de retenção de output: log técnico limpa em 30d, relatório 1 ano.
🔵 5.7.J3: Redigir Retention policies Storage DB.
🔵 5.7.C4: Criar UI de Outputs: listar, filtrar, detalhar e botão de exportar PDF.
🔵 5.7.J4: Definir PDF Export format rules.
🔵 5.7.C5: Implementar UI validator de integridade: comparar hash DB vs hash texto real.
🔵 5.7.J5: Validar PR do CODEX da Fase 5.7.
🔵 5.8.C1: Criar testes de schema para 100% dos manifests do corporate-v1.
🔵 5.8.J1: Estabelecer Test Schema Coverage rules.
🔵 5.8.C2: Criar smoke execution em modo dry-run para cada agente do catálogo.
🔵 5.8.J2: Documentar Dry Run Test Suite expectations.
🔵 5.8.C3: Criar teste de regressão E2E garantindo funcionamento dos mocks das tools.
🔵 5.8.J3: Especificar Mocks/MSW architecture.
🔵 5.8.C4: Adicionar a suite de testes de Pack no workflow de CI principal.
🔵 5.8.J4: Definir CI Pipeline Gates para os Packs.
🔵 5.8.C5: Criar handlers do MSW (Mock Service Worker) interceptando APIs de terceiros.
🔵 5.8.J5: Validar PR do CODEX da Fase 5.8.
🔵 5.9.C1: Gerar docs (MDX) extraindo infos dos manifests via script Node.
🔵 5.9.J1: Definir MDX Auto-gen spec architecture.
🔵 5.9.C2: Integrar leitura de docs no modal de side-drawer do Agent Marketplace.
🔵 5.9.J2: Especificar UI Drawer Docs integration.
🔵 5.9.C3: Implementar extração da chave "changelog" criando histórico visual na UI.
🔵 5.9.J3: Definir Changelog parsing logic requirements.
🔵 5.9.C4: Adicionar examples JSON realistas no seed do banco para vitrine.
🔵 5.9.J4: Cobrar JSON Examples Seed consistentes.
🔵 5.9.C5: Criar painel de comparação (Tabela) de features entre Agentes.
🔵 5.9.J5: Validar PR do CODEX da Fase 5.9.
🔵 5.10.C1: Executar e atestar os smoke tests E2E dry-run de todo o catálogo.
🔵 5.10.J1: Auditar resultados dos Smoke Tests Packs.
🔵 5.10.C2: Ajustar e corrigir schemas incompletos apontados no review arquitetural.
🔵 5.10.J2: Auditar se Codex aplicou as correções dos JULES Reports.
🔵 5.10.C3: Validar que MDX gerados preenchem 100% dos campos de documentação.
🔵 5.10.J3: Conferir Auto-Docs presence no repositório.
🔵 5.10.C4: Rodar testes confirmando falha estrita caso budget atinja 100% de uso.
🔵 5.10.J4: Auditar logs de falha dos Budget Constraint Tests.
🔵 5.10.C5: Fechar fase 5 no Master Checklist e assinar branch de merge.
🔵 5.10.J5: Assinatura de Fechamento do Ciclo.
🔵 6.1.C1: Criar schema Prisma para Workflow, Step, Transition e WorkflowExecution.
🔵 6.1.J1: Desenhar o ERD para Workflow Relations no Prisma.
🔵 6.1.C2: Implementar parser de Directed Acyclic Graph (DAG) validando loops infinitos.
🔵 6.1.J2: Definir algoritmos de parsing DAG para evitar Cycles.
🔵 6.1.C3: Criar API CRUD de Workflows suportando Draft, Published e Archived.
🔵 6.1.J3: Documentar API Draft/Publish state design.
🔵 6.1.C4: Implementar validação Zod para os payloads dinâmicos de config de Step.
🔵 6.1.J4: Especificar uso de Zod Discriminator unions para tipos de nós.
🔵 6.1.C5: Atualizar seed.ts adicionando 2 workflows funcionais na org default.
🔵 6.1.J5: Validar PR do CODEX da Fase 6.1.
🔵 6.2.C1: Criar WorkflowRunner: gerencia estado da run e avança para próximo nó.
🔵 6.2.J1: Arquitetar o WorkflowRunner Engine.
🔵 6.2.C2: Implementar interpolação Mustache {{ step.A.out }} lendo do state cache.
🔵 6.2.J2: Definir Mustache JSONPath standards.
🔵 6.2.C3: Configurar retry com backoff via BullMQ isolado a nível de Step.
🔵 6.2.J3: Documentar BullMQ Step isolation rules.
🔵 6.2.C4: Implementar Step "Wait" (Delay) paralisando via delay do Redis/BullMQ.
🔵 6.2.J4: Especificar Delay node BullMQ handling.
🔵 6.2.C5: Salvar output de cada nó na tabela StepResult com restrição max de 200KB.
🔵 6.2.J5: Validar PR do CODEX da Fase 6.2.
🔵 6.3.C1: Criar Trigger Webhook com geração de URL única assinada por tenant.
🔵 6.3.J1: Arquitetar validação de Webhook Trigger signatures.
🔵 6.3.C2: Criar Trigger Cron conectando Repeatable Jobs do BullMQ ao Workflow.
🔵 6.3.J2: Escrever Cron Job BullMQ logic.
🔵 6.3.C3: Criar Trigger EventBus escutando eventos internos da plataforma.
🔵 6.3.J3: Mapear EventBus subscription topics.
🔵 6.3.C4: Criar endpoint de execução manual (Run Now) validando permissão.
🔵 6.3.J4: Definir Manual Run RBAC constraints.
🔵 6.3.C5: Implementar deduplicação de Triggers num hash de 5s no Redis.
🔵 6.3.J5: Validar PR do CODEX da Fase 6.3.
🔵 6.4.C1: Criar Node Nativo HTTP Request com headers, body paramétrico e JWT.
🔵 6.4.J1: Especificar HTTP Request Node requirements.
🔵 6.4.C2: Criar Node Condition (If/Else) usando engine json-rules-engine.
🔵 6.4.J2: Especificar Condition Node evaluation rules.
🔵 6.4.C3: Criar Node Javascript usando sandbox seguro (isolated-vm ou vm2).
🔵 6.4.J3: Restringir JS Sandbox constraints (< 1000ms, NO network).
🔵 6.4.C4: Criar Node Data Transformer (Map/Filter lowcode).
🔵 6.4.J4: Desenhar Map/Filter schema design.
🔵 6.4.C5: Criar Node Send Notification disparando alerta via provider.
🔵 6.4.J5: Validar PR do CODEX da Fase 6.4.
🔵 6.5.C1: Criar Node Agent Execute enviando prompt para o LLM Engine.
🔵 6.5.J1: Arquitetar Agent Execute async polling state.
🔵 6.5.C2: Injetar variáveis do runtime do workflow no System Prompt do Agente.
🔵 6.5.J2: Definir System Prompt injection overrides.
🔵 6.5.C3: Tratar falha de agente: Stop Workflow ou Fallback branch.
🔵 6.5.J3: Definir Agent Failure Fallback logic branches.
🔵 6.5.C4: Criar Node AI Text Extract (Prompt sem tools apenas JSON extração).
🔵 6.5.J4: Configurar Fast Extract Prompt schema.
🔵 6.5.C5: Integrar limites do Workflow com a tabela QuotaUsage paywall.
🔵 6.5.J5: Validar PR do CODEX da Fase 6.5.
🔵 6.6.C1: Instalar React Flow no frontend em /workflows/[id]/edit.
🔵 6.6.J1: Documentar React Flow state sync requirements.
🔵 6.6.C2: Criar layouts de Custom Nodes estilizados e conectores (handles).
🔵 6.6.J2: Projetar Custom Nodes UI patterns.
🔵 6.6.C3: Construir Sidebar configuradora gerando form a partir de schemas Zod.
🔵 6.6.J3: Mapear Sidebar schema-to-form logic.
🔵 6.6.C4: Configurar MiniMap e plugin DagreD3D para auto-organizar nós.
🔵 6.6.J4: Exigir Auto-layout Dagre specs.
🔵 6.6.C5: Desenvolver Live Validator colorindo nós quebrados de vermelho.
🔵 6.6.J5: Validar PR do CODEX da Fase 6.6.
🔵 6.7.C1: View de Historico /workflows/[id]/runs listando execuções.
🔵 6.7.J1: Desenhar Runs Grid UX layout.
🔵 6.7.C2: Visual Debugger no ReactFlow pintando caminhos percorridos.
🔵 6.7.J2: Especificar Visual Debugger Color logic.
🔵 6.7.C3: Permitir clique no nó do Visual Debugger revelando Input/Output JSON.
🔵 6.7.J3: Exigir Payload Redaction no Drawer visual.
🔵 6.7.C4: Adicionar botão Retry reiniciando exatamente do nó que falhou.
🔵 6.7.J4: Arquitetar Retry Execution state-machine database.
🔵 6.7.C5: Exibir painel de gargalos (gantt chart de ms por nó).
🔵 6.7.J5: Validar PR do CODEX da Fase 6.7.
🔵 6.8.C1: Suíte Unit Tests para parser DAG (5 grafos inválidos).
🔵 6.8.J1: Mapear DAG test cases map.
🔵 6.8.C2: Teste Integração Runner passando por If/Else assertando "Then".
🔵 6.8.J2: Exigir Runner branch logic tests isolation.
🔵 6.8.C3: Teste Workflow com MSW bloqueando disparo real de requests HTTP.
🔵 6.8.J3: Arquitetar MSW mock infrastructure tests.
🔵 6.8.C4: Teste cancelamento API verificando Worker interrupção.
🔵 6.8.J4: Testar Cancellation propagation.
🔵 6.8.C5: Inserir suíte automação E2E Workflow no Actions CI (green pass).
🔵 6.8.J5: Validar PR do CODEX da Fase 6.8.
🔵 6.9.C1: Config Node Caching (GET request pula execução via Redis TTL).
🔵 6.9.J1: Especificar Caching TTL logic rules.
🔵 6.9.C2: Arrays grandes agrupam notificação para não spammar cliente.
🔵 6.9.J2: Escrever Batching Notifications algorithm.
🔵 6.9.C3: Limitador Runtime (Max depth 50) explícito no loop do Runner.
🔵 6.9.J3: Exigir Max Depth protection contra DDoS de loops.
🔵 6.9.C4: Rotação automática de assinaturas (X-Birthhub-Signature) outgoing.
🔵 6.9.J4: Arquitetar Webhook Signature specs.
🔵 6.9.C5: Hard limit memory (128MB) na invocação Isolated-VM Code.
🔵 6.9.J5: Validar PR do CODEX da Fase 6.9.
🔵 6.10.C1: Validar UI visual criando 1 fluxo complexo manual no React Flow.
🔵 6.10.J1: Auditar UI Manual creation checks.
🔵 6.10.C2: Zerar warnings ESLint no pacote workflows-core.
🔵 6.10.J2: Avaliar Clean ESLint check e dívidas.
🔵 6.10.C3: Atestar proteção RLS impedindo cross-tenant em workflows.
🔵 6.10.J3: Check Cross-tenant zero leak results.
🔵 6.10.C4: Smoke Test Workflow -> Agent CEO -> DB E2E completo.
🔵 6.10.J4: Review E2E WF+Agent logs.
🔵 6.10.C5: Assinar checklist confirmando integração completa.
🔵 6.10.J5: Assinatura de Finalização Novo Ciclo 3.
🔵 7.1.C1: Criar schema de Plan, Subscription, Invoice e PaymentMethod no Prisma.
🔵 7.1.J1: Especificar Prisma Billing relations ERD.
🔵 7.1.C2: Adicionar enum status de assinatura: trial, active, past_due, canceled, paused.
🔵 7.1.J2: Mapear SubStatus state rules.
🔵 7.1.C3: Expandir Organization com stripe_customer_id indexado e plan_id.
🔵 7.1.J3: Definir Tenant Stripe index policies.
🔵 7.1.C4: Criar modelo UsageRecords (precificação variável/metered por consumo Tokens).
🔵 7.1.J4: Documentar Metered usage schema limits.
🔵 7.1.C5: Modificar seed.ts injetando Planos default: Starter, Pro e Enterprise.
🔵 7.1.J5: Validar PR do CODEX da Fase 7.1.
🔵 7.2.C1: Instalar e configurar Stripe Node SDK consumindo secrets via Zod.
🔵 7.2.J1: Arquitetar Stripe integration security.
🔵 7.2.C2: Adicionar criação síncrona de Customer no Stripe na criação da Org.
🔵 7.2.J2: Definir Customer sync DB transactions.
🔵 7.2.C3: Criar rota de Checkout devolvendo URL assinada do Hosted Stripe Checkout.
🔵 7.2.J3: Especificar Checkout Hosted strategy.
🔵 7.2.C4: Criar rota devolvendo magic link do Stripe Customer Portal.
🔵 7.2.J4: Determinar Portal Self-service limits.
🔵 7.2.C5: Criar sync-plans.ts para puxar Products do Stripe e espelhar banco local.
🔵 7.2.J5: Validar PR do CODEX da Fase 7.2.
🔵 7.3.C1: Criar /api/webhooks/stripe e injetar constructEvent exigindo raw_body signature.
🔵 7.3.J1: Exigir Webhook signature mandate.
🔵 7.3.C2: Lidar com checkout.session.completed ativando a Assinatura.
🔵 7.3.J2: Mapear Sub Activation state rules.
🔵 7.3.C3: Lidar com invoice.payment_succeeded salvando log PAID e URL recibo.
🔵 7.3.J3: Definir Invoice PAID logging actions.
🔵 7.3.C4: Lidar com invoice.payment_failed movendo a Sub para past_due.
🔵 7.3.J4: Definir Failed payment cascades.
🔵 7.3.C5: Lidar com customer.subscription.deleted baixando para Freemium imediatamente.
🔵 7.3.J5: Validar PR do CODEX da Fase 7.3.
🔵 7.4.C1: Criar Guard @RequireFeature lendo o plano ativo do Tenant no JWT/Cache.
🔵 7.4.J1: Arquitetar Paywall Decorator limits.
🔵 7.4.C2: Implementar count() de recursos (Workflows) contra maxLimit do plano.
🔵 7.4.J2: Mapear Exception Count queries seguras.
🔵 7.4.C3: Modificar Worker BullMQ para abortar task se Tenant estiver past_due.
🔵 7.4.J3: Estabelecer Worker Pause logic on past_due.
🔵 7.4.C4: Linkar QuotaService com os campos JSON flexíveis vindos da Tabela Plan.
🔵 7.4.J4: Definir Quota dynamic JSON linking.
🔵 7.4.C5: Incluir objeto 'plan_status' na rota /me para a UI renderizar cadeados visuais.
🔵 7.4.J5: Validar PR do CODEX da Fase 7.4.
🔵 7.5.C1: Construir Página Pública /pricing listando tiers lidos direto do Banco.
🔵 7.5.J1: Desenhar Pricing Page Layout Wireframes.
🔵 7.5.C2: Criar Settings > Billing UI informando renovação e barra de usage de quota.
🔵 7.5.J2: Especificar Billing Settings UI metrics.
🔵 7.5.C3: Tabela UI de Histórico de Faturas com Link pro PDF do Stripe Host.
🔵 7.5.J3: Orientar Invoices PDF rendering link external.
🔵 7.5.C4: Criar Modal React Upgrade Paywall interceptando Erros 402 HTTP no Axios.
🔵 7.5.J4: Definir Paywall Modal Axios UX flow.
🔵 7.5.C5: Rotas de retorno /billing/success (react-confetti) e /billing/cancel.
🔵 7.5.J5: Validar PR do CODEX da Fase 7.5.
🔵 7.6.C1: Criar rotas API Analytics lendo Materialized Views do Postgres.
🔵 7.6.J1: Analisar Materialized Views performance impact.
🔵 7.6.C2: Backoffice UI com gráficos MRR, ARR, Churn para visão de SaaS.
🔵 7.6.J2: Mapear Backoffice Charts D3/Recharts.
🔵 7.6.C3: Query SQL formatada para Cohort Analysis de Retenção de usuários.
🔵 7.6.J3: Escrever SQL Cohort standards documentation.
🔵 7.6.C4: Endpoint CSV Data Dump restrito (faturas de 30 dias).
🔵 7.6.J4: Validar CSV export security clearance.
🔵 7.6.C5: Script DAU/MAU classificando Ativo apenas se engatilhou 1 workflow/agente.
🔵 7.6.J5: Validar PR do CODEX da Fase 7.6.
🔵 7.7.C1: Configurar Dunning 3 dias Grace Period antes de lockar requisições.
🔵 7.7.J1: Mapear Dunning 72h Grace limits rules.
🔵 7.7.C2: Componente Navbar Global alertando suspensão pendente < 24hrs.
🔵 7.7.J2: Desenhar Navbar Lockout Banner spec.
🔵 7.7.C3: Workers enviando e-mails sequenciais de cobrança (Dia 1, Dia 3, Cancela).
🔵 7.7.J3: Arquitetar Email Warning Queue triggers.
🔵 7.7.C4: Webhook reativação: Ao pagar, retirar locks e restaurar cache do Worker.
🔵 7.7.J4: Definir Reactivation DB unlocks strict.
🔵 7.7.C5: Frontend Layout bloqueia navegação exigindo URL /billing pra contas suspensas.
🔵 7.7.J5: Validar PR do CODEX da Fase 7.7.
🔵 7.8.C1: Vitest __mocks__ instanciando classe Fake Stripe para CI rodar offline.
🔵 7.8.J1: Especificar Stripe Mock class reqs.
🔵 7.8.C2: Teste unitário Webhook Endpoint assertando Erro 400 em hash corrompido.
🔵 7.8.J2: Documentar Signature falsification tests.
🔵 7.8.C3: Teste idempotente repetindo 'invoice.paid' 3x não duplicando validade do plano.
🔵 7.8.J3: Exigir Idempotent DB lock rules test.
🔵 7.8.C4: Teste API Paywall Supertest c/ token freemium tentando mutar Enterprise -> 402.
🔵 7.8.J4: Orientar Supertest Paywalls CI assertions.
🔵 7.8.C5: Teste manipulando mock Date para testar virada do Dia 4 travando APIs.
🔵 7.8.J5: Validar PR do CODEX da Fase 7.8.
🔵 7.9.C1: Cron Noturno empacotando faturas num log JSON formatado para S3.
🔵 7.9.J1: Avaliar S3 Invoice Batching log security.
🔵 7.9.C2: Injetar Locale/Country no Checkout mapeando Stripe Tax.
🔵 7.9.J2: Mapear Tax localization architecture.
🔵 7.9.C3: Habilitar Proration Logic convertendo downgrades em Créditos de Tenant.
🔵 7.9.J3: Exigir Proration credit math correctness.
🔵 7.9.C4: Checkout rastreia erros de cartão banindo temporariamente IP via Redis.
🔵 7.9.J4: Definir Fraud block limiters Redis params.
🔵 7.9.C5: Instalar Redlock no webhook de Stripe blindando Race Conditions.
🔵 7.9.J5: Validar PR do CODEX da Fase 7.9.
🔵 7.10.C1: Print de coverage isolado de Billing > 95% incluindo Feature Guards.
🔵 7.10.J1: Analisar Review Coverage Billing.
🔵 7.10.C2: Corrigir warnings Jules Code Review nos tokens de pagamento.
🔵 7.10.J2: Audit Auth Secrets exposure risks.
🔵 7.10.C3: Playwright E2E: Cria org, assina Starter, ganha feature, executa node.
🔵 7.10.J3: Auditar E2E Playwright Review video/log.
🔵 7.10.C4: Verificar que Webhook Secrets vêm 100% lidas do Vault (Zero Hardcode).
🔵 7.10.J4: Webhooks keys hardcode check code audit.
🔵 7.10.C5: Checkbox verde na ramificação de Pagamentos. Assinar etapa.
🔵 7.10.J5: Assinatura Arquitetural Fechamento Ciclo 7.
🔵 8.1.C1: Middleware Redis leitura Tenant Data. Prisma > Redis TTL 5min.
🔵 8.1.J1: Desenhar Architecture Caching limits.
🔵 8.1.C2: Extensão Prisma ($use) limpando Keys do Redis no Update/Delete.
🔵 8.1.J2: Validar Redis Invalidation patterns.
🔵 8.1.C3: Cache-Control e ETag nas Listagens de Catálogo retornando 304.
🔵 8.1.J3: Exigir ETag hashing configs API.
🔵 8.1.C4: SWR/React Query Frontend adotando stale-while-revalidate agressivo.
🔵 8.1.J4: Definir UX Frontend Caching strategy.
🔵 8.1.C5: Testes Unitários de Hit/Miss validando Mock Count() Prisma.
🔵 8.1.J5: Validar PR do CODEX da Fase 8.1.
🔵 8.2.C1: Trocar String DB para Pooling via pgbouncer=true no Prisma App API.
🔵 8.2.J1: Analisar PgBouncer vs Accelerate params.
🔵 8.2.C2: Setup connection_limit = 10 segurando OOM Worker distribuindo concorrência.
🔵 8.2.J2: Mapear Pool connection thresholds math.
🔵 8.2.C3: Migração de Otimização (Indexes Parciais SQL: WHERE status = 'PENDING').
🔵 8.2.J3: Validar Partial Index performance gain.
🔵 8.2.C4: Caça aos N+1. Modificar controllers para usar Prisma include/select.
🔵 8.2.J4: Code Review Strict Anti N+1 queries.
🔵 8.2.C5: Documentação de ganho em ms obtido nas Queries (antes x depois EXPLAIN).
🔵 8.2.J5: Validar PR do CODEX da Fase 8.2.
🔵 8.3.C1: Adicionar SLOs.md: P95 Latência < 300ms e 99.9% Uptime global.
🔵 8.3.J1: Aprovar documento SLOs targets oficiais.
🔵 8.3.C2: Criar JSON template IaC de dashboards Grafana/Datadog.
🔵 8.3.J2: Revisar Painéis de Telemetria json.
🔵 8.3.C3: AlertManager acionado se P95 cruzar 500ms por 5m.
🔵 8.3.J3: Auditar Alert rules latência config.
🔵 8.3.C4: AlertManager Falha severa rate(errors)>1% em 10 mins pro Slack.
🔵 8.3.J4: Auditar Alert rules error_rate slack.
🔵 8.3.C5: Rota Deep Health (/health/deep) executando insert temporário do BD e apagando.
🔵 8.3.J5: Validar PR do CODEX da Fase 8.3.
🔵 8.4.C1: Ajustar BullMQ Concurrency lendo os.cpus().length.
🔵 8.4.J1: Analisar OS Threads tuning specs.
🔵 8.4.C2: Backpressure. Endpoints recusam triggers (429) se fila exceder 10.000 jobs.
🔵 8.4.J2: Projetar Backpressure drop logic.
🔵 8.4.C3: Criar Fila Dedicada de Email apartada da LLMQueue.
🔵 8.4.J3: Definir QoS Queue splitting email.
🔵 8.4.C4: Configurar RateLimit do Job Queue por tenant impedindo monopólio.
🔵 8.4.J4: Configurar Tenant Quota Fair-share.
🔵 8.4.C5: Script de Drenagem CLI tirando jobs de DLQ processando retries lentos manuais.
🔵 8.4.J5: Validar PR do CODEX da Fase 8.4.
🔵 8.5.C1: Setar V8 --max-old-space-size adequadamente nos containers Worker.
🔵 8.5.J1: Analisar Heap Memory limit sizing.
🔵 8.5.C2: YAML base de HPA (Horizontal Pod Autoscaler) target 70% CPU API.
🔵 8.5.J2: Mapear Kubernetes HPA trigger rules.
🔵 8.5.C3: Garbage collection buffer=null em scopes de S3 Storage.
🔵 8.5.J3: Revisar Memory Leak Blobs GC.
🔵 8.5.C4: Teste Unitario MemWatch loopando 1000 chamadas garantindo heap reset.
🔵 8.5.J4: Auditar Memory Leak CI Test assertions.
🔵 8.5.C5: Trocar pacotes monolíticos do React (Moment->Date-FNS) reduzindo bundle.
🔵 8.5.J5: Validar PR do CODEX da Fase 8.5.
🔵 8.6.C1: Middleware Proteção Brute Force focado na /auth/login bloqueando IP em 15min.
🔵 8.6.J1: Analisar Brute Force limits Auth.
🔵 8.6.C2: Limiter dinâmico acoplado às rotas Webhook Inbound contra DDoS public.
🔵 8.6.J2: Mapear DDoS Mitigation Webhooks API.
🔵 8.6.C3: Payload Size limit express.json({limit: '5mb'}) bloqueando RAM crash vectors.
🔵 8.6.J3: Exigir Payload size strict limits.
🔵 8.6.C4: Connection Timeout 10s em handlers sincronos (anti-Slowloris zombies).
🔵 8.6.J4: Auditar Timeout Drop configurations.
🔵 8.6.C5: Exportar regra de AWS WAF basica proibindo blocos geograficos anômalos.
🔵 8.6.J5: Validar PR do CODEX da Fase 8.6.
🔵 8.7.C1: Script Shell pg_dump automatizado diário com GZIP.
🔵 8.7.J1: Auditar DUMP Script Syntax logic.
🔵 8.7.C2: AWS CLI Upload bash subindo zip de DB para S3 Bucket encriptado.
🔵 8.7.J2: Mapear AWS S3 Bucket Backup Rules.
🔵 8.7.C3: Script reverso Pg_Restore viabilizando recuperação rápida staging.
🔵 8.7.J3: Checar Restore Integrity Scripts.
🔵 8.7.C4: Elaborar DRP (Disaster Recovery Plan) com tempos alvos de downtime.
🔵 8.7.J4: Aprovar DRP Document RTO/RPO limits.
🔵 8.7.C5: Plugar UptimeRobot (token API) acionando SMS se VPC cair.
🔵 8.7.J5: Validar PR do CODEX da Fase 8.7.
🔵 8.8.C1: Pnpm run --latest subindo base para patch atual corrigindo exploits.
🔵 8.8.J1: Analisar Breaking Changes de Major Bumps.
🔵 8.8.C2: Depcheck purgar pacotes inúteis de package.json.
🔵 8.8.J2: Auditar limpezas de Dependências.
🔵 8.8.C3: Remover chamadas diretas de New Function() ou Evals inseguros.
🔵 8.8.J3: Scan Manual contra Eval/Injection JS.
🔵 8.8.C4: Documentar Step obrigatório de CI SecOps nas tags v1.0.
🔵 8.8.J4: Assinar Manual CI Release Steps.
🔵 8.8.C5: Pnpm Audit Prod tratando dependências Alta/Crítica.
🔵 8.8.J5: Validar PR do CODEX da Fase 8.8.
🔵 8.9.C1: K6 Script JS carga VU (100 concurrent) contra auth.
🔵 8.9.J1: Validar Parametros K6 Script Users/Duration.
🔵 8.9.C2: K6 Script Webhook Stress 1000 req/sec no Redis injest.
🔵 8.9.J2: Mapear Redis Spike Tolerance tests.
🔵 8.9.C3: Teste Flood manual 5000 itens BullMQ monitorando esgotamento CPU sem Restart Node.
🔵 8.9.J3: Analisar CPU Threshold Queue saturation.
🔵 8.9.C4: Exportar log e criar relatório mitigatório no Markdown das rotas que falharam no stress.
🔵 8.9.J4: Avaliar Mitigation Report Bottlenecks.
🔵 8.9.C5: K6 (threshold limits) falha se Latência P95 estourar SLO de 300ms.
🔵 8.9.J5: Validar PR do CODEX da Fase 8.9.
🔵 8.10.C1: Relatorio final HTML/CSV do K6 Pass pra ser auditado.
🔵 8.10.J1: Aprovar K6 Final Report Metrics.
🔵 8.10.C2: Codar correções exigidas na revisão de HPA/Pooling de DB.
🔵 8.10.J2: Validar HPA fixes de Código Final.
🔵 8.10.C3: Tela limpa do Audit NPM sem riscos severos.
🔵 8.10.J3: Auditar Zero Critical Audit NPM screen.
🔵 8.10.C4: Executar Dump/Restore validando Integrity Check local.
🔵 8.10.J4: Conferir Restore Run Terminal Dump verde.
🔵 8.10.C5: Marcar Novo Ciclo 4 concluído e avançar.
🔵 8.10.J5: Assinatura JULES Fechamento Infra/Performance Ciclo 4.
🔵 9.1.C1: Criar schema Prisma para In-App Notifications com índice otimizado [userId, isRead].
🔵 9.1.J1: Analisar Schema Notification Indexes DB.
🔵 9.1.C2: Endpoints de Notificação API (List, markAsRead, markAllAsRead).
🔵 9.1.J2: Mapear Batch Update markAll API.
🔵 9.1.C3: Componente React de Sino (Navbar) com Badge live counter (Polling).
🔵 9.1.J3: Projetar Sino React Hook UI Polling.
🔵 9.1.C4: Painel de notificações Dropdown design UI com agrupamento visual por dia.
🔵 9.1.J4: Definir Dropdown Recency Sorting UX.
🔵 9.1.C5: Worker aciona DB notification informando falhas de Agentes na conta do dono criador.
🔵 9.1.J5: Validar PR do CODEX da Fase 9.1.
🔵 9.2.C1: Tabela e UI Settings de Notification Preferences (Opt-in email, opt-in platform).
🔵 9.2.J1: Especificar Opt-out/Opt-in GDPR Rules.
🔵 9.2.C2: Templates React Email/MJML corporativos para "Seu agente terminou".
🔵 9.2.J2: Analisar MJML template responsive code.
🔵 9.2.C3: Fila BullMQ de emails checa o banco Preferences bloqueando opt-outs.
🔵 9.2.J3: Exigir Preferences Guarding in Queue.
🔵 9.2.C4: Service worker genérico inicial public/sw.js para PushWeb future.
🔵 9.2.J4: Documentar Service Worker PWA configs.
🔵 9.2.C5: Teste Email Invite do ciclo 2 usando layouts HTML bonitos formatados.
🔵 9.2.J5: Validar PR do CODEX da Fase 9.2.
🔵 9.3.C1: Instanciar PostHog Analytics Provider raiz no Next.js.
🔵 9.3.J1: Configurar Provider Tree Next.js.
🔵 9.3.C2: Espalhar trackEvents nas UIs criticas ("Botão Run clicado").
🔵 9.3.J2: Mapear Core Track Events Dictionary.
🔵 9.3.C3: LGPD Filter (Omitir nome completo, enviar só ID opaco pro Tracker).
🔵 9.3.J3: Impor PII tracker obfuscation constraints.
🔵 9.3.C4: Cookie Consent Tool global do frontend atrelando flag permissiva.
🔵 9.3.J4: Analisar Cookie Consent Storage state.
🔵 9.3.C5: Check Adblocker (componentes não crasham App se bloqueados).
🔵 9.3.J5: Validar PR do CODEX da Fase 9.3.
🔵 9.4.C1: Script SQL gerando contagens rapidas de DAU/WAU em RunLogs.
🔵 9.4.J1: Definir Math DAU/WAU metric SQL.
🔵 9.4.C2: Health Score Engine Job avaliando métricas de tenant.
🔵 9.4.J2: Criar Pontuação Formula Health Score.
🔵 9.4.C3: Campo health_score alimentado por Job Diário no DB.
🔵 9.4.J3: Especificar Schedule Cronjob CS Score.
🔵 9.4.C4: Alertar CS caso score caia de < 40 pontos (Churn Risk iminente).
🔵 9.4.J4: Churn Risk Threshold alert routing.
🔵 9.4.C5: Painel CS no Admin lendo as organizações por piores scores.
🔵 9.4.J5: Validar PR do CODEX da Fase 9.4.
🔵 9.5.C1: Adapter nativo HubSpot consumindo chave de conta.
🔵 9.5.J1: Arquitetar Hubspot Node Adapter API.
🔵 9.5.C2: Ouvir 'tenant.created' e dar push inserindo card na Company pipeline.
🔵 9.5.J2: Mapear Tenant-to-Company DB sync.
🔵 9.5.C3: Worker sobe o campo bh_health_score direto pro CRM.
🔵 9.5.J3: Exigir Sync diário Custom Props CRM.
🔵 9.5.C4: Fallback Job queue e backoff delay na integração HubSpot rate limit 429.
🔵 9.5.J4: Design API 429 Retry logic Hubspot.
🔵 9.5.C5: Exportar documento /docs orientando setup CRM manual.
🔵 9.5.J5: Validar PR do CODEX da Fase 9.5.
🔵 9.6.C1: Tabela Webhooks Outbound e Painel Frontend de configuração Tenant.
🔵 9.6.J1: Definir Outbound Webhooks UX schema.
🔵 9.6.C2: Worker genérico dispara POST pra URLs externas assinando HMAC.
🔵 9.6.J2: Segurança HMAC Outgoing Payloads.
🔵 9.6.C3: Tabela WebhookDelivery Log. Retenção de 7d das requisições.
🔵 9.6.J3: Limites Retenção Log Delivery DB.
🔵 9.6.C4: Botão Retry reenvia payload Webhook especifico se cliente perdeu.
🔵 9.6.J4: Mapear Dead-Letter Webhook Resend UI.
🔵 9.6.C5: Auto-Disable webhook connection flag se 10 Erros 500 seguidos.
🔵 9.6.J5: Validar PR do CODEX da Fase 9.6.
🔵 9.7.C1: Schema AgentFeedback. Rating (-1 e 1) referenciando AgentExecution.
🔵 9.7.J1: Projetar Schema SQL Feedback (-1,1).
🔵 9.7.C2: React Thumbs Up/Down UI e Modal 'O que deveriamos ter respondido'.
🔵 9.7.J2: Mapear UX Rating Buttons in Output View.
🔵 9.7.C3: Rota POST/UPSERT processando as votações e edição de voto antigo.
🔵 9.7.J3: Proteger POST Rating com Tenant Guard.
🔵 9.7.C4: Média de Aceitação listada no Card Público do Agente no Marketplace.
🔵 9.7.J4: Calcular Approval Rate no Backend.
🔵 9.7.C5: Tabela de relatorio listando feedbacks de rating negativo Time Prompting.
🔵 9.7.J5: Validar PR do CODEX da Fase 9.7.
🔵 9.8.C1: CLI Node extraindo pares User->Assistant salvos num JSONL.
🔵 9.8.J1: Definir Training Data JSONL Export Spec.
🔵 9.8.C2: Garantir Redaction de tokens pessoais no dump de JSONL.
🔵 9.8.J2: Mandatório Privacy PII JSONL Purge.
🔵 9.8.C3: Extrair expected_output do BD para RLHF Training material.
🔵 9.8.J3: Escrever RLHF DB Extraction rules.
🔵 9.8.C4: CI Check de formatação perfeita sem quebra linhas .JSONL gerado.
🔵 9.8.J4: Linter Strict rules para JSONL outputs.
🔵 9.8.C5: Upload Cron do JSONL para Storage S3 versionado.
🔵 9.8.J5: Validar PR do CODEX da Fase 9.8.
🔵 9.9.C1: Painel Super Admin. Total ARR e Org Counts global.
🔵 9.9.J1: Especificar Master Global SaaS Charts.
🔵 9.9.C2: Relatorio Custos: Custo API IA versus Mensalidade arrecadada.
🔵 9.9.J2: Mapear Cost vs Profit Graph Logic.
🔵 9.9.C3: Relatorio Engines: Agentes mais usados na base do SaaS.
🔵 9.9.J3: Top Agents View Ranking queries.
🔵 9.9.C4: Impersonate Tenant sob Guard Super Admin (login fake pra suporte).
🔵 9.9.J4: Architect Impersonation Security Guard.
🔵 9.9.C5: PDF Dashboard Export rodando Puppeteer headless backend.
🔵 9.9.J5: Validar PR do CODEX da Fase 9.9.
🔵 9.10.C1: Validar UI integrações sinos in-app testes de envio E2E.
🔵 9.10.J1: Review final de Notifications E2E logs.
🔵 9.10.C2: Logs limpos atestando Mock HubSpot testes de CRM.
🔵 9.10.J2: Auditar console outputs de CRM Mock.
🔵 9.10.C3: Checar injeção correta Telemetria Provider no Next.js.
🔵 9.10.J3: Code Review Telemetry injection Tree.
🔵 9.10.C4: Suíte Test Unitário fórmula Score 100 com métricas DB.
🔵 9.10.J4: Auditar Score Math Tests formulas.
🔵 9.10.C5: Aprovar encerramento das Integrações Client-facing.
🔵 9.10.J5: Assinar Fase Ciclo 9 Concluída.
🔵 10.1.C1: output: 'standalone' Dockerfile limpo App Web Nextjs.
🔵 10.1.J1: Analisar Next.js Standalone Docker efficiency.
🔵 10.1.C2: Dockerfile Alpine para apps/api e apps/worker base diretório dist/.
🔵 10.1.J2: Aprovar Node Alpine dist/ build config.
🔵 10.1.C3: USER node no dockerfile travando permissão root containers.
🔵 10.1.J3: Checar Non-root USER specs containers.
🔵 10.1.C4: HEALTHCHECK CMD provando viabilidade continua da imagem.
🔵 10.1.J4: Auditar Docker Healthchecks rules.
🔵 10.1.C5: docker-compose.prod.yml mapeando subredes reais isolando DB.
🔵 10.1.J5: Validar PR do CODEX da Fase 10.1.
🔵 10.2.C1: Separação GH Actions (PR test, Staging e Prod Deploy).
🔵 10.2.J1: Analisar Branching CI Deploy strategies.
🔵 10.2.C2: Registry build step AWS ECR login via OIDC push tags.
🔵 10.2.J2: Confirmar OIDC Github-AWS Auth sem keys.
🔵 10.2.C3: Step ECS Service/Kubernetes rollout continuo.
🔵 10.2.J3: Mapear CD Rollout steps Infra.
🔵 10.2.C4: npx prisma migrate deploy no pipeline bloqueando rollout falho.
🔵 10.2.J4: Testar DB Migrate Gate no deployment.
🔵 10.2.C5: CURL Webhook Notification Slack/Teams pos deploy verde.
🔵 10.2.J5: Validar PR do CODEX da Fase 10.2.
🔵 10.3.C1: Paginas estaticas Legal (Termos de Uso, Privacidade) public.
🔵 10.3.J1: Revisar Legal links Frontend exposure.
🔵 10.3.C2: Botão de Perigo `Solicitar Exclusão De Dados`.
🔵 10.3.J2: Mapear DB Cascade Wipe Logic UI.
🔵 10.3.C3: Zip Downloader ExportData formatando BD limpo do usuario.
🔵 10.3.J3: Exigir Portability Export Privacy Shield.
🔵 10.3.C4: Retention File Log Policies rotativas expurgo 180 dias.
🔵 10.3.J4: Verificar Logrotate configs OS layer.
🔵 10.3.C5: Scanner Test de ausência de ID pessoal de cliente deletado.
🔵 10.3.J5: Validar PR do CODEX da Fase 10.3.
🔵 10.4.C1: Sistema forçado puxar strings Secrets Manager Cloud em Prod.
🔵 10.4.J1: Analisar Cloud Parameter Store Integration.
🔵 10.4.C2: Revogação completa massiva Keys Dev phase velhos leakados.
🔵 10.4.J2: Auditar Global Key Wipe Operation.
🔵 10.4.C3: Escalonamento CPU Cost BcryptAuth API Prod.
🔵 10.4.J3: Check Bcrypt Cost factors environment diff.
🔵 10.4.C4: Headers HSTS Strict Transport Proxy Configurator.
🔵 10.4.J4: Validar HSTS Nginx/Cloudflare settings.
🔵 10.4.C5: Fechar origens CORS Engine REST bloqueando chamadas externas.
🔵 10.4.J5: Validar PR do CODEX da Fase 10.4.
🔵 10.5.C1: Catalogação Global Variables em Markdown base reference.
🔵 10.5.J1: Aprovar Ultimate Env Vars Document.
🔵 10.5.C2: Validation Provisionamento Terraform checando redes VPC.
🔵 10.5.J2: Analisar Terraform Security Scans (tfsec).
🔵 10.5.C3: TLS Socket mandatorio contra instancias REDIS nuvem.
🔵 10.5.J3: Exigir In-transit encryption Redis config.
🔵 10.5.C4: SSLMode=Require URL Connection String JDBC Postgree.
🔵 10.5.J4: Verificar SSLMode DB strict checks.
🔵 10.5.C5: Test Suite Handshake SSL simulando falha conexão em cleartext.
🔵 10.5.J5: Validar PR do CODEX da Fase 10.5.
🔵 10.6.C1: Configs Nextjs Headers Caching Immutable Max Age CSS JS.
🔵 10.6.J1: Analisar CDN Edge caching headers rules.
🔵 10.6.C2: Rotação plugin next bundle analizer (charts forms Async Chunk).
🔵 10.6.J2: Check Webpack Bundle Split performance.
🔵 10.6.C3: Ativar GZIP/Brotli compressions JSON Body Nginx/Express.
🔵 10.6.J3: Mapear GZIP compressions payload sizes.
🔵 10.6.C4: Next Image src nativo aplicando Webp AVIF dinamicamente.
🔵 10.6.J4: Exigir Image Optimization Tags Nextjs.
🔵 10.6.C5: Tag Rel Preload aplicadas fontes customizadas (anti-FOUT).
🔵 10.6.J5: Validar PR do CODEX da Fase 10.6.
🔵 10.7.C1: TS Bulk Data Processing batches para ingestão legada V1.
🔵 10.7.J1: Review final de ETL Scripts Migration Logic.
🔵 10.7.C2: Dry Run ETL contra Fork Staging printando output summary.
🔵 10.7.J2: Analisar Dry Run Migration Logs Reports.
🔵 10.7.C3: Data Quality Check Script verificando colunas de TenantID.
🔵 10.7.J3: Aprovar Data Quality Verification Tests.
🔵 10.7.C4: Assertion de Login cruzado (Credencial V0 entra na V1).
🔵 10.7.J4: Check Legacy Password Hash conversions.
🔵 10.7.C5: Rollback SQL statements disponiveis caso o go-live deturpe banco.
🔵 10.7.J5: Validar PR do CODEX da Fase 10.7.
🔵 10.8.C1: Master E2E. "Acesso na home", "Cadastro e Email link Mock".
🔵 10.8.J1: Analisar Playwright E2E Master Scripts 1.
🔵 10.8.C2: Master E2E. "Assinatura cartao Test Stripe", "Desbloqueio modulo admin".
🔵 10.8.J2: Analisar Playwright E2E Billing Gates 2.
🔵 10.8.C3: Master E2E. "Setup Pack do Marketplace e Trigger workflow de envio Email".
🔵 10.8.J3: Analisar Playwright E2E Workflows 3.
🔵 10.8.C4: Master E2E. "Acesso Historico Logs garantindo RLS e Log out clean".
🔵 10.8.J4: Analisar Playwright E2E RLS Checks 4.
🔵 10.8.C5: Empacotamento video record Artifact Run Playwright 100% pass.
🔵 10.8.J5: Validar PR do CODEX da Fase 10.8.
🔵 10.9.C1: Gate final: Turbo Run Test:Smoke em todos Modulos s/ quebras.
🔵 10.9.J1: Analisar V1.0 Global CI Test Result.
🔵 10.9.C2: Documento Releases_1.0.md c/ features publicas e Docs anexos.
🔵 10.9.J2: Aprovar Changelog e Release Notes markdown.
🔵 10.9.C3: Tag Git version release_v1.0.0 fixando hash point.
🔵 10.9.J3: Auditar V1.0 Git Tags e Branch Protections.
🔵 10.9.C4: Release Notes na tab Github compilando PRs e contributors.
🔵 10.9.J4: Verificar Release Artifacts GH Deployments.
🔵 10.9.C5: Merge main prod branch ativando pipeline de esteira Action continuo.
🔵 10.9.J5: Validar PR do CODEX da Fase 10.9 (Produção).
🔵 10.10.C1: Fechar Review Checklist Master verificando todos itens C1 a C10 verdes.
🔵 10.10.J1: Emitir Laudo Definitivo de Arquitetura V1.0 - 1000 Itens Concluídos.
🔵 10.10.C2: Exigir assinatura dupla JULES Approval validando ausência bugs.
🔵 10.10.J2: Analisar Auditorias Segurança Finais Third-Party Integrations.
🔵 10.10.C3: Screenshot do Terminal Green All tests passed coverage +90 no PR description.
🔵 10.10.J3: Assinar digitalmente Evidência de Coverage de Plataforma +90%.
🔵 10.10.C4: Handover. Desmobilizacao da task CODEX devolvendo status passivo.
🔵 10.10.J4: Suspender Atividade Dev Ativa, Transição JULES Mode Operações.
🔵 10.10.C5: Finalização. BirthHub360 Version 1.0 Live. Tarefa Concluída.
🔵 10.10.J5: V1.0 LIVE! Encerramento Oficial do Desenvolvimento Base da Plataforma!


## 4. FORMATO DE SAIDA
HTML ROBUSTO, ORGANIZADO, COM AS INFORMAÇÕES CLARAS, E CONTENDO A ANÁLISE DE AUDITORIA, COM UM PROMPT PARA QUALQUER IA EXECUTAR O QUE FALTA SER IMPLEMENTADO, E MELHORAR O QUE PRECISA SER MELHORADO.


SEJA 100% VERDADEIRO, ELOGIE TUDO O QUE TIVER QUE SER ELOGIADO E CRITIQUE TUDO  O QUE TIVER QUE SER CRITICADO.


FAÇA A MELHOR ANÁLISE E O MELHOR PLANO DA SUA VIDA.