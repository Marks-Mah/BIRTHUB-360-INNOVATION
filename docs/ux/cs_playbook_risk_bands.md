# Playbook de Ação CS por Faixa de Risco (Risk Bands) - BirthHub 360

## Objetivo
Padronizar a resposta da equipe de Customer Success com base nas faixas de risco geradas pelo modelo de Health Score (documentado em `health_score_model.md`), garantindo intervenções precisas para combater churn e incentivar expansão.

## Faixa 1: Risco Crítico / Churn Iminente (Health Score: 0 - 49)

**Cenários Comuns:** Falha persistente em integração (CRM desconectado), redução súbita de 80%+ nas Horas Automatizadas, inatividade do "Sponsor" (quem comprou a ferramenta).
**SLA de Resposta:** 1 Dia Útil.

**Ações (Playbook Vermelho):**
1. **O Alarme (Trigger):** Notificação no Slack da Squad de Retenção.
2. **Investigação Silenciosa:** O CSM revisa os logs de erro no Mixpanel/Datadog. (Ex: "A senha do Salesforce do cliente expirou e a IA não consegue puxar leads").
3. **Comunicação Ativa:** O CSM não envia e-mail genérico ("Tudo bem por aí?"). Ele envia o "E-mail de Diagnóstico Prévio":
   * *Mensagem:* "Oi [Sponsor], vi que seus agentes pararam de gerar relatórios porque a conexão com o Salesforce caiu na quinta-feira. Isso está te custando ~20 horas/semana de trabalho manual. Posso resetar isso para você em uma call de 5 minutos hoje às 14h?"
4. **Escalação:** Se não houver resposta em 3 dias, escalar para o Account Executive para tentativa de contato via telefone.

## Faixa 2: Risco Médio / Adoção Estagnada (Health Score: 50 - 79)

**Cenários Comuns:** O cliente usa a ferramenta, mas num padrão ineficiente (Ex: O gestor configurou o Agente SDR, mas ainda aprova 100% dos e-mails manualmente, limitando o ROI).
**SLA de Resposta:** 5 Dias Úteis.

**Ações (Playbook Amarelo):**
1. **Campanha de Educação Contextual:** Disparar campanha automatizada focada na dor específica.
   * *Mensagem:* "Notei que você aprovou 100 e-mails manualmente esta semana. Sabia que 80% dos nossos clientes ligam o Modo Auto-Pilot após a primeira semana? Veja este vídeo de 1 minuto de como calibrar seu Agente para rodar sozinho com segurança."
2. **Convite para Webinar/QBR:** Se a conta for estratégica, o CSM convida para uma Revisão Trimestral (QBR) focada em "Destravar valor avançado".

## Faixa 3: Saudável / Ponto de Expansão (Health Score: 80 - 100)

**Cenários Comuns:** WUAHT (Horas Úteis Automatizadas) crescentes WoW. Modo Auto-Pilot ativado. Zero erros.
**SLA de Resposta:** Monitoramento contínuo (SLA de Campanha Mensal).

**Ações (Playbook Verde):**
1. **Captura de Prova Social:** Enviar e-mail de celebração automatizado com a métrica principal: "Sua equipe economizou 200 horas este mês. Como foi a experiência? (NPS Survey incorporado)".
2. **Passagem de Bastão (Upsell):** Se o cliente respondeu "Promotor" (9 ou 10), o CSM avisa o Account Executive: "O Cliente X extraiu o máximo do Agente SDR. É o momento perfeito para oferecer um trial do Agente de Sales Ops".
