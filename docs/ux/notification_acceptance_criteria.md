# Critérios de Aceite para Novas Notificações - BirthHub 360

## Objetivo
Fornecer um checklist rigoroso ("Gate") que o agente JULES (Engenharia/Produto) deve verificar antes de aprovar e fazer o deploy de um novo tipo de notificação (E-mail, In-App, Slack/Teams) criada por qualquer Agente IA ou funcionalidade da plataforma.

## A "Regra de Ouro" da Interrupção
Uma notificação é uma interrupção no fluxo de trabalho do usuário. Se o custo da interrupção for maior que o valor da informação, a notificação é considerada um "Bug de UX" e será rejeitada.

## Checklist de Avaliação (JULES Gate)

Para que um novo evento (ex: `agent.sdr.email_replied`) seja autorizado a disparar um alerta, ele deve passar em 100% dos critérios abaixo:

### 1. Relevância e Acionabilidade (Actionability)
- [ ] **A notificação exige uma ação clara?** (Sim/Não). Se for apenas um aviso ("O agente atualizou 5 campos"), deve ser registrado silenciosamente nos logs da plataforma, não em um alerta ativo.
- [ ] **Existe um Call-to-Action (CTA) direto?** O e-mail ou push contém um botão ou link profundo (Deep Link) que leva o usuário exatamente para a tela onde a ação deve ser tomada (ex: "Aprovar E-mail Rascunho").

### 2. Controle de Frequência e Consolidação (Capping)
- [ ] **O evento suporta agrupamento (Batching)?** Se o Agente SDR receber 20 respostas positivas em uma hora, a plataforma enviará 20 e-mails ou 1 e-mail consolidado? (Exige-se consolidação para eventos não críticos).
- [ ] **Respeita a regra de 1 E-mail/Dia (para não-críticos)?** A notificação foi corretamente classificada no sistema de mensageria para entrar no "Daily Digest" caso não seja urgente?

### 3. Governança e Privacidade (Compliance)
- [ ] **Está livre de PII Sensível no payload?** O texto da notificação (especialmente Push e E-mail) foi revisado para não conter telefones, valores de contratos milionários ou CPFs expostos diretamente (conforme `notification_privacy_analysis.md`)?
- [ ] **O usuário pode desativar especificamente ESTE alerta?** A nova notificação foi adicionada ao painel de Preferências (Settings) com um toggle de On/Off?
- [ ] **Possui link de Unsubscribe em 1-clique?** (Apenas para e-mails).

### 4. SLA e Performance (System Design)
- [ ] **O disparo é assíncrono?** A geração da notificação não bloqueia o processamento principal do Agente IA (LangGraph) nem adiciona latência à resposta da API para o frontend.
- [ ] **O canal de envio atende ao SLA?** In-App < 5s; E-mail < 2min (conforme `notification_delivery_sla.md`).

## Processo de Aprovação
1. O desenvolvedor implementa a notificação e cria o template (ex: `email/templates/new_lead_intent.html`).
2. JULES revisa o PR contra este checklist.
3. Se houver falha (ex: PII exposta no payload do Slack), o PR é bloqueado.
