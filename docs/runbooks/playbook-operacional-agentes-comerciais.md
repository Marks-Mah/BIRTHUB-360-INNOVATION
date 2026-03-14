# Playbook Operacional — Agentes Comerciais BirthHub 360

## Objetivo
Padronizar a operação dos 10 agentes comerciais com critérios claros de entrada, execução, sucesso e fallback, conectando a operação diária ao backlog técnico do monorepo.

## Escopo
Este playbook cobre os agentes:
- BDR
- Closer
- Sales Ops
- Enablement
- KAM
- Partners
- Field
- Pre-Sales
- Copywriter
- Social

## Contrato operacional comum (todos os agentes)
1. **Entrada mínima obrigatória**
   - `tenant_id`
   - `request_id`
   - `event_id` (quando acionado por evento)
   - payload validado por schema
2. **Execução padrão**
   - Processamento em fila dedicada por agente.
   - Logs estruturados com `trace_id` e contexto de tenant.
   - Timeout/retry/circuit breaker para chamadas externas.
3. **Saída esperada**
   - Resultado estruturado (`status`, `reason`, `next_action`).
   - Auditoria de decisão e trilha de execução.
4. **Fallback padrão**
   - Erro recuperável: retry com política exponencial.
   - Erro não recuperável: encaminhar para DLQ com motivo de falha.
   - Evento duplicado: retorno idempotente sem efeito colateral.

## Playbook por agente

### 1) BDR (Business Development Representative)
- **Entrada:** ICP, segmento, território, persona, canais permitidos, limite diário de contatos.
- **Ferramentas:** busca de leads, validação de e-mail, sequência de outreach.
- **Critérios de sucesso:** lead qualificado com evidência mínima (perfil + contato válido + fit ICP).
- **Métricas:** taxa de qualificação, bounce rate, tempo médio até primeira resposta.
- **Fallback:** e-mail inválido/canal indisponível -> rota alternativa + replanejamento de sequência.
- **Backlog associado:** I08, I10, I16, I20, M31, M33.

### 2) Closer
- **Entrada:** oportunidade qualificada, histórico de objeções, política comercial ativa.
- **Ferramentas:** análise de objeções, aprovação de desconto, minuta de contrato.
- **Critérios de sucesso:** avanço de etapa válido no funil ou fechamento com justificativa registrada.
- **Métricas:** win rate, ciclo médio de fechamento, desconto médio por faixa.
- **Fallback:** impasse de negociação -> escalonamento para gestor + proposta alternativa versionada.
- **Backlog associado:** I02, I05, I15, I16, M11, M12.

### 3) Sales Ops
- **Entrada:** snapshot CRM, regras de roteamento, metas de forecast por período.
- **Ferramentas:** limpeza de CRM, previsão de receita, distribuição de leads.
- **Critérios de sucesso:** dados sem duplicidade crítica e forecast dentro de faixa de erro definida.
- **Métricas:** completude de CRM, erro de forecast, SLA de atribuição de lead.
- **Fallback:** inconsistência de dados -> bloqueio de publicação + fila de reconciliação.
- **Backlog associado:** I01, I06, I08, I20, M14, M16.

### 4) Enablement
- **Entrada:** gravações/transcrições, trilha de competências, metas de coaching.
- **Ferramentas:** análise de chamadas, cards de coaching, quizzes de treinamento.
- **Critérios de sucesso:** plano de melhoria com ações acionáveis e lacunas priorizadas.
- **Métricas:** aderência ao playbook de venda, evolução por competência, taxa de conclusão de treinamentos.
- **Fallback:** baixa qualidade de áudio/transcrição -> reprocessamento + revisão humana assistida.
- **Backlog associado:** I07, I20, M21, M33.

### 5) KAM (Key Account Manager)
- **Entrada:** carteira ativa, health score, stakeholders e plano de expansão.
- **Ferramentas:** account planning, mapeamento de stakeholders, agendamento de QBR.
- **Critérios de sucesso:** plano de conta atualizado com risco/oportunidade e próximos passos aprovados.
- **Métricas:** NRR por carteira, churn risk mitigado, cobertura de QBR no período.
- **Fallback:** conta sem dados suficientes -> acionar Sales Ops para enriquecimento e reconciliação.
- **Backlog associado:** I03, I12, I13, I25, M46.

### 6) Partners
- **Entrada:** cadastro do parceiro, regras de comissionamento, elegibilidade de lead.
- **Ferramentas:** registro de lead via parceiro, cálculo de comissão, envio de collateral.
- **Critérios de sucesso:** lead registrado sem conflito e comissão calculada com trilha auditável.
- **Métricas:** throughput de leads por parceiro, tempo de aprovação, divergência de comissão.
- **Fallback:** conflito de ownership -> abrir caso de arbitragem com bloqueio de pagamento até decisão.
- **Backlog associado:** I05, I16, I18, M12.

### 7) Field
- **Entrada:** agenda de visitas, território, inventário e prioridades do dia.
- **Ferramentas:** otimização de rota, relatório de visita, checagem de estoque.
- **Critérios de sucesso:** visitas executadas com evidência geotemporal e pendências capturadas.
- **Métricas:** visitas concluídas/dia, desvio de rota, taxa de follow-up no prazo.
- **Fallback:** indisponibilidade de mobilidade/conectividade -> modo offline com sincronização posterior.
- **Backlog associado:** I18, I20, M22, M41.

### 8) Pre-Sales
- **Entrada:** escopo técnico, requisitos funcionais/não funcionais, prazo de resposta.
- **Ferramentas:** geração de demo, respostas a RFP, checagem de viabilidade.
- **Critérios de sucesso:** proposta técnica consistente com arquitetura e riscos explícitos.
- **Métricas:** tempo de resposta a RFP, taxa de aprovação técnica, retrabalho por proposta.
- **Fallback:** requisito ambíguo -> retorno estruturado de dúvidas + checklist de descoberta.
- **Backlog associado:** I09, I11, M15, M20.

### 9) Copywriter
- **Entrada:** objetivo da campanha, audiência, canal, tom de voz e compliance.
- **Ferramentas:** geração de script, reescrita de e-mail, posts sociais.
- **Critérios de sucesso:** peça publicada com aderência à marca, CTA claro e revisão de risco.
- **Métricas:** CTR, taxa de resposta, score de conformidade de conteúdo.
- **Fallback:** risco de conteúdo (PII/toxicidade/claims) -> bloqueio automático + revisão humana.
- **Backlog associado:** M29, M30, M31, M33.

### 10) Social
- **Entrada:** contas alvo, pauta da semana, critérios de engajamento.
- **Ferramentas:** descoberta de perfil, comentários em post, solicitação de conexão.
- **Critérios de sucesso:** engajamento qualificado sem violar política de canal.
- **Métricas:** taxa de conexão aceita, interações qualificadas, respostas iniciadas.
- **Fallback:** limitação/rate limit da plataforma -> reduzir cadência e reprogramar fila.
- **Backlog associado:** I08, I17, I20, M24.

## Cadência operacional recomendada

### Rotina diária
1. Verificar dashboard de throughput/latência por agente.
2. Conferir DLQ por severidade e iniciar reprocessamento controlado.
3. Revisar alertas de custo/token e anomalias de execução.

### Rotina semanal
1. Revisar métricas de sucesso por agente e decidir ajustes de prompt/política.
2. Executar avaliação com golden dataset dos agentes críticos.
3. Atualizar runbook com incidentes e novos padrões de fallback.

## Matriz de priorização (90 dias)
- **Fase 1 — Confiabilidade base:** I08, I16, I20.
- **Fase 2 — Qualidade e governança:** I07, M30, M33.
- **Fase 3 — Escala e eficiência:** I17, I18, M31, M41.

## Definition of Done para mudanças em agentes
- Evidência de teste (happy path + erro + edge case).
- Métrica operacional atualizada em dashboard.
- Fallback validado (retry, DLQ ou escalonamento humano).
- Registro de contrato/versionamento quando houver impacto entre serviços.
