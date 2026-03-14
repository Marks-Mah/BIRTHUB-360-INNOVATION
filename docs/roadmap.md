# Roadmap Trimestral por Domínio (2026)

Este roadmap organiza as entregas por trimestre para os domínios principais do BirtHub 360: Marketing, SDR, AE, CS, Financeiro, Jurídico e BI.

## Q1 2026 — Fundação (Sprints 1–2)

### Marketing
- Implementar ingestão confiável de campanhas (Google Ads e Meta Ads) com reconciliação diária.
- Padronizar eventos de funil para atribuição multi-touch.

### SDR
- Consolidar Lead Repository no gateway com filtros por score/status/assignee.
- Ativar fluxo executável de qualificação e roteamento automático no orquestrador.

### AE
- Evoluir ferramentas de reunião para disponibilidade real (Google/Outlook) e sincronização de CRM.
- Definir testes de regressão para outputs críticos de proposta.

### CS
- Implementar fluxo `HEALTH_ALERT` com ações de playbook e notificações.
- Expor health score operacional no dashboard com tendência e severidade.

### Financeiro
- Estruturar Financial Repository com MRR, churn, inadimplência e projeções.
- Validar migration + seed determinístico para indicadores financeiros.

### Jurídico
- Implementar Contract Repository com versionamento e estados de assinatura.
- Definir padrões de webhook idempotente para Clicksign/DocuSign.

### BI
- Implantar Analytics Repository com agregações e cache/materialized views.
- Definir SLI/SLO iniciais de latência e completude de dados.

## Q2 2026 — Operação (Sprints 3–4)

### Marketing
- Publicar tela de analytics/attribution com CAC, LTV e ROI por canal.
- Habilitar alertas de desvio de performance por campanha.

### SDR
- Implementar RBAC por recurso/ação nas rotas de leads.
- Instrumentar taxa de conversão e tempo de resposta por etapa.

### AE
- Integrar transcrição de reuniões (Whisper/Deepgram) com resumo estruturado.
- Adicionar observabilidade por etapa do workflow comercial.

### CS
- Entregar painel de churn risk e fluxo `CHURN_RISK_HIGH` com escalonamento.
- Implementar reprocessamento de jobs críticos de atendimento via DLQ.

### Financeiro
- Integrar provedor de pagamentos unificado (Stripe/Pagar.me/Asaas).
- Expor visão financeira mensal no dashboard com drill-down.

### Jurídico
- Entregar tela operacional de contratos com filtros, preview e status.
- Implementar trilha de auditoria para mudanças administrativas.

### BI
- Entregar relatório executivo `BOARD_REPORT` agendado (segunda, 8h).
- Consolidar métricas Prometheus/Grafana por serviço e fluxo.

## Q3 2026 — Hardening (Sprints 5+)

### Marketing
- Otimização de custo por canal com recomendações automáticas.
- Alertas de qualidade de dados de atribuição.

### SDR
- Isolamento de filas por tenant enterprise e limites de budget/tokens.
- Testes de carga em cenários de pico de leads.

### AE
- Sandbox de ferramentas externas com kill switch e timeout por operação.
- Avaliação offline de prompts com baseline por segmento.

### CS
- Estratégia de retenção automatizada orientada por score e histórico.
- Testes de recuperação para workflows longos com estado persistido.

### Financeiro
- Automação fiscal (Focus NFe) com reprocessamento de rejeições.
- Data quality checks diários para inconsistências financeiras.

### Jurídico
- Política de retenção/arquivamento de contratos e evidências.
- Reforço de compliance de PII com redaction em logs.

### BI
- Dashboards orientados a SLO com alertas PagerDuty/OpsGenie.
- Simulações periódicas de desastre com restauração validada em staging.

## Dependências e Marcos

- **M1 (fim de Q1):** Gateway e orquestrador com caminhos críticos executáveis.
- **M2 (fim de Q2):** Dashboard operacional completo + integrações críticas em produção assistida.
- **M3 (fim de Q3):** Operação hardened com SLOs estáveis e playbooks validados.
