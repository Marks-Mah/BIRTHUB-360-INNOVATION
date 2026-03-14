# Política de Comunicação de Incidentes (Incident Communication Policy)

Este documento estabelece as diretrizes de comunicação externa (com clientes/tenants) durante e após incidentes técnicos que impactem a disponibilidade, performance ou segurança da plataforma BirthHub360.

O princípio fundamental é a **Transparência Proativa (Proactive Transparency)**: Os clientes devem ser informados de problemas que os afetam diretamente antes mesmo de precisarem acionar o suporte.

## 1. Classificação de Incidentes e Público-Alvo

A forma e o canal de comunicação dependem da gravidade do incidente (Severidade - SEV) e de quem foi afetado (Raio de Impacto - Blast Radius).

### 1.1. Incidente Global (Impacta múltiplos Tenants)
*   **O Que É:** O banco de dados primário caiu, o Cloudflare está fora do ar, ou um bug crítico de frontend impede o login de todos os usuários.
*   **Quem Comunicar:** A totalidade da base de clientes (StatusPage).
*   **Canal:** Atualização pública e imediata na página de status (ex: `status.birthhub360.com`).
*   **Prazo (SLA de Comunicação):** Em até **15 minutos** da confirmação do alerta interno.

### 1.2. Incidente Específico (Tenant-Specific ou Feature-Specific)
*   **O Que É:** Um cluster de workers específico do plano Pro atrasou o processamento de relatórios, ou um único Tenant de grande porte (Enterprise) está travado devido a dados corrompidos na sua partição (Efeito Noisy Neighbor restrito).
*   **Quem Comunicar:** Apenas os Administradores (Owners/Admins) das organizações afetadas.
*   **Canal:** E-mail de Serviço (Service Notification) direcionado e Banner in-app visível apenas para esses `tenant_ids`.
*   **Prazo (SLA de Comunicação):** Em até **30 a 60 minutos** após a contenção/identificação de que o SLA contratado do cliente foi rompido ou que a resolução demorará horas. (Vide SLA em `docs/performance/tenant-slos.md`).

### 1.3. Incidente de Segurança (Data Breach / LGPD)
*   **O Que É:** Vazamento confirmado de dados cross-tenant (RLS falhou), credenciais expostas ou acesso indevido por atacante.
*   **Quem Comunicar:** O DPO (Data Protection Officer) do cliente, ou o Administrador Principal.
*   **Canal:** E-mail formal de Segurança e, para clientes Enterprise, contato telefônico imediato pelo Gerente de Contas (TAM).
*   **Prazo Legal (LGPD Art. 48):** Comunicação à ANPD e ao Titular dos Dados em **prazo razoável** (Adoção padrão da indústria: notificação preliminar em até 48 a 72 horas após a confirmação da extensão do vazamento).

## 2. Conteúdo e Formato da Mensagem (O Quê Dizer)

Mensagens de incidente devem ser sucintas, livres de jargões excessivos e responder a quatro perguntas fundamentais:
1.  **O que está acontecendo? (Sintoma visível)**: *"Identificamos uma instabilidade no módulo de geração de relatórios mensais."*
2.  **Qual o impacto? (Como afeta o cliente)**: *"Alguns relatórios agendados podem atrasar ou apresentar erro ao tentar download manual."*
3.  **O que estamos fazendo? (Ação em curso)**: *"Nossa equipe de engenharia já isolou o problema e está escalando a infraestrutura de processamento para normalizar a fila."*
4.  **Quando haverá atualizações? (Próximo contato)**: *"Forneceremos uma nova atualização em 1 hora ou assim que o serviço for restabelecido."*

**O Que Evitar:**
*   **Não invente prazos de resolução irreais** (ETA - Estimated Time of Arrival) a menos que a solução já esteja testada e em processo de deploy.
*   **Não prometa RCA (Root Cause Analysis)** imediatamente na primeira mensagem; aguarde o incidente terminar.
*   **Não culpe fornecedores terceiros publicamente na primeira linha** (A responsabilidade de arquitetar resiliência para a AWS cair é nossa).

## 3. Pós-Incidente (Post-Mortem / RCA)

Após a resolução de incidentes críticos (SEV-1 ou SEV-2 Globais) que causaram quebra dos SLAs de latência ou disponibilidade (ex: downtime > 43 minutos no mês para clientes Pro):
*   A equipe de engenharia (SRE) tem até **5 dias úteis** para finalizar um relatório de *Root Cause Analysis (RCA)*.
*   O relatório deve ser purgado de informações sensíveis (Hashes, IPs internos, Nomes de funcionários) e enviado por e-mail para todos os clientes afetados.
*   O documento deve explicar a causa raiz, a linha do tempo do evento e, criticamente, as **Ações Preventivas (Action Items)** já adotadas para garantir que o mesmo problema não ocorra novamente.