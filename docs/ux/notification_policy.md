# Política de Notificações - BirthHub 360

## Objetivo
Estabelecer diretrizes claras para o envio de notificações (In-App, E-mail, Slack/Teams) geradas pelos Agentes de IA e pela plataforma, visando maximizar o engajamento útil e eliminar o ruído (fadiga de notificação).

## 1. Princípios Essenciais
- **Ação sobre Informação:** O sistema não deve notificar passivamente ("O agente terminou de ler a lista"). Só deve notificar quando uma ação humana for necessária ou um marco crítico de negócio for atingido ("O Agente encontrou 3 leads Enterprise quentes que precisam da sua aprovação para disparo").
- **Tolerância Zero ao Spam:** O usuário deve ter controle total sobre o que recebe e com qual frequência.

## 2. Frequência Máxima e Consolidação (Digests)
- **Regra de Ouro (Capping):** Um usuário nunca deve receber mais de 1 e-mail transacional (não-urgente) da plataforma por dia.
- **Notificações em Tempo Real (Event-Driven):** Apenas para eventos definidos pelo usuário como "High Priority" (Ex: Agendamento Confirmado via Bot, ou Risco Severo de Churn em conta Key Account).
- **Consolidação Diária/Semanal (Digest):** Eventos de rotina devem ser agrupados. (Ex: Em vez de 50 e-mails de "Lead Qualificado pelo Agente", enviar 1 e-mail às 8h da manhã: *"Resumo Matinal: Seu Agente SDR qualificou 50 novos leads ontem"*).

## 3. Opt-Out e Granularidade Obrigatórios
- **Configuração no Perfil (Settings):** O usuário deve possuir um painel de "Preferências de Notificação" cobrindo:
  - Canais (E-mail, In-App Bell, Slack, Teams).
  - Tipos (Alertas de Agentes, Relatórios de Desempenho, Falhas Técnicas de Integração).
  - Frequência (Imediato, Digest Diário, Desativado).
- **Unsubscribe "One-Click":** Todo e-mail gerado pela plataforma deve conter um link `[Unsubscribe deste tipo de alerta]` no rodapé, sem requerer login prévio para aplicar a preferência.

## 4. Priorização In-App (The Notification Bell)
- **Vermelho (High):** Erros de integração (ex: Token do Salesforce expirou) ou falhas críticas do Agente (ex: Rate limit da OpenAI estourou). Exige intervenção imediata para o BirthHub continuar funcionando.
- **Azul (Medium):** Ações pendentes de agentes em modo "Draft/Copiloto" (ex: "Revise os 10 e-mails gerados antes de enviar").
- **Cinza (Low):** Relatórios periódicos ou milestones alcançados (ex: "Seu Agente economizou 100 horas este mês!").
