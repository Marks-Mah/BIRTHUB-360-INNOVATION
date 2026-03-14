# SLA de Entrega de Notificações - BirthHub 360

## Objetivo
Definir o Service Level Agreement (SLA) para a latência de entrega de notificações geradas pela plataforma aos usuários finais, garantindo a percepção de tempo real e confiabilidade do sistema.

## Categorias de SLA e Tempos Alvo

### 1. Notificações In-App (WebSocket / Polling Rápido)
- **Cenário:** O Agente de IA conclui uma tarefa em background (ex: redigiu um e-mail, identificou risco de churn) enquanto o usuário está navegando no dashboard do BirthHub 360.
- **SLA Alvo:** **< 5 Segundos.**
- **Mecanismo:** O "Sino" de notificações (Notification Bell) deve atualizar seu contador instantaneamente ou um toast notification ("Agente concluiu análise da Conta X") deve aparecer sem a necessidade de recarregar a página.
- **Tolerância de Falha:** Aceitável até 15 segundos em picos de carga. Acima disso, a UX é prejudicada, pois o usuário pode achar que a IA "travou" ou não processou a tarefa.

### 2. E-mails Transacionais (SMTP / Provedor Externo)
- **Cenário:** Um alerta crítico de segurança (novo login), um erro de integração (token expirou) ou o envio de um relatório gerencial consolidado (Daily Digest).
- **SLA Alvo:** **< 2 Minutos.**
- **Mecanismo:** A plataforma enfileira o evento de e-mail (ex: via Redis/BullMQ) e dispara imediatamente via provedor (SendGrid/AWS SES). A latência inclui o tempo de processamento da fila e a entrega pelo provedor.
- **Tolerância de Falha:** Para e-mails como "Redefinição de Senha" ou "Confirmação de Acesso", atrasos > 30 segundos causam abandono do fluxo de login e frustração severa. Para relatórios agendados (Digest de 8h), atrasos < 15 minutos são aceitáveis.

### 3. Integrações de Chat Ops (Slack / Microsoft Teams)
- **Cenário:** O Agente envia um alerta de pipeline diretamente em um canal da equipe de vendas ou via mensagem direta (DM) para o AE responsável.
- **SLA Alvo:** **< 10 Segundos.**
- **Mecanismo:** Webhooks síncronos disparados logo após a conclusão da tarefa pela IA no backend.
- **Tolerância de Falha:** Em integrações assíncronas de terceiros, dependemos da latência da API deles. O BirthHub deve garantir o enfileiramento e tentativas (retries) com backoff exponencial se a API do Slack rate-limitar ou falhar, sem atrasar processos internos do orquestrador.

## Monitoramento e Visibilidade do SLA
A equipe de Engenharia de Confiabilidade (SRE) monitorará a latência fim-a-fim e acionará alertas no PagerDuty caso o tempo médio da fila de notificações (Queue Time) ultrapasse os limites estabelecidos acima.
