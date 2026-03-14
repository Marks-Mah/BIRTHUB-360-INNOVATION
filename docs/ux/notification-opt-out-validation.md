# Validação de Opt-out e Frequência de Notificações

## Objetivo
Garantir que a plataforma cumpre com a política de "Fadiga de Notificação" e as regras de privacidade e conformidade (Anti-Spam/LGPD).

## Checklist de Validação Executado
1. [x] **Unsubscribe Link:** Todos os templates de e-mail (Marketing e Resumo Diário) gerados pela plataforma possuem um link visível `{{ unsubscribe_url }}` no rodapé.
2. [x] **Preferências de Usuário:** A tela de Settings -> Notifications permite desabilitar e-mails de resumos de atividade.
3. [x] **Respeito à Flag (Backend):** O `NotificationService` verifica a coluna `email_opt_out = FALSE` antes de despachar eventos para o serviço de mensageria, suprimindo o envio se o usuário optou por sair.
4. [x] **Rate Limit / Throttling:** Disparos de webhook para "Human Handoff" estão configurados para no máximo 1 a cada 5 minutos por Tenant para evitar bombardeio (Flood).

**Status:** Aprovado. O sistema não fará "Spam" nas caixas de entrada dos clientes B2B.
