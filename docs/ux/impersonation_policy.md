# Política de Impersonation (Login como Cliente) - BirthHub 360

## Objetivo
Estabelecer as regras de segurança e auditoria para o recurso de "Impersonation" (quando um agente de suporte/CS loga na plataforma utilizando a visão e as permissões de um cliente para investigar um bug ou ajudar na configuração).

## 1. Regra de Autorização e Consentimento
- **Proibição de Acesso Silencioso:** É estritamente proibido o uso da ferramenta de impersonation sem uma solicitação ativa do cliente (um ticket de suporte aberto) que justifique a investigação.
- **Consentimento Expresso:** O painel de suporte não permite clicar em "Log in as User" a menos que o CSM marque uma checkbox confirmando: *"Possuo consentimento explícito (por e-mail ou chat) do usuário para acessar sua conta neste momento."*

## 2. Limitações de Escopo Durante o Impersonation (Read-Only Default)
Para evitar que a equipe de BirthHub altere dados críticos de clientes ou dispare agentes acidentalmente:
- **Modo Leitura (Read-Only):** A sessão de impersonation é injetada com uma flag `is_impersonated=true`. O frontend e backend desativam a capacidade de salvar configurações, criar novos Agentes, assinar planos de pagamento ou disparar e-mails para leads do CRM.
- **Dados Sensíveis Mascarados:** O CSM vê o layout como o cliente veria, mas campos de PII profunda (como o corpo dos e-mails sincronizados do Gmail do cliente) são renderizados com blur (desfocados) por padrão no CSS, exigindo um clique explícito "Revelar para Diagnóstico" que gera um alerta de segurança extra.

## 3. Auditoria e Logging (The Paper Trail)
- **Registro Imutável:** Cada sessão iniciada gera um registro na tabela global de auditoria com: `admin_id`, `tenant_id`, `impersonated_user_id`, `ticket_reference`, `start_time` e `ip_address`.
- **Notificação ao Cliente:** Ao iniciar o impersonation, o cliente proprietário da conta recebe um e-mail transacional automatizado: *"Um especialista do BirthHub 360 (Nome do CSM) acessou sua conta agora mesmo para ajudar com o Ticket #1234. O acesso será revogado em 1 hora."*
- **Sessão Expirável:** A sessão expira forçadamente após 60 minutos, deslogando o CSM.

## 4. Revisão de Segurança (SOC2 / ISO27001)
Mensalmente, o time de Segurança da Informação (SecOps) revisa um relatório amostral dos logs de impersonation, cruzando com os tickets do Zendesk. Qualquer acesso "órfão" (sem ticket correspondente) é tratado como violação grave da política interna de dados.
