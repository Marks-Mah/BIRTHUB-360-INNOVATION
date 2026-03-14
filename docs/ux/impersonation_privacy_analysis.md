# Análise de Privacidade e Segurança do Impersonation - BirthHub 360

## Objetivo
Mapear o escopo de exposição de dados PII e Financeiros durante sessões de impersonation por funcionários do BirthHub 360, e definir as proteções técnicas (LGPD) necessárias para mitigar riscos de espionagem ou vazamento interno.

## 1. O Risco de Exposição de Dados
Quando um CSM acessa a conta de um cliente ("Log in as..."), ele "veste" a camada de acesso (RLS) daquele cliente. Sem controles adicionais de frontend, o CSM teria acesso irrestrito a:
- Base completa de Leads (Nomes, e-mails, telefones).
- Conteúdo de cadências de e-mails enviados/recebidos (podendo conter segredos industriais ou propostas de preços).
- Detalhes de faturamento do Tenant (Cartão de crédito, faturas).

## 2. Mascaramento Dinâmico de PII (Redaction in UI)

A política implementada é "Ver a Estrutura, Não o Conteúdo". Quando o token JWT contém a flag `impersonator: true`, a UI se comporta de maneira restritiva:

| Componente UI | O que o Cliente Vê | O que o CSM Vê (Impersonating) |
| :--- | :--- | :--- |
| **Lista de Leads** | `João Silva (Diretor, Banco XP)` | `J*** S**** (Diretor, B**** **)` |
| **Log do Agente (E-mail)** | "Prezado João, nossa proposta é R$ 50.000." | "Prezado [Redacted], nossa proposta é [Confidential]." |
| **Dashboard de Billing** | Cartão final `*4242`, link para NF | Aba de Billing bloqueada com aviso de Permissão Negada. |

## 3. O Botão "Quebra-Vidro" (Break-Glass Consent)
Se a resolução do bug depender exclusivamente da visualização do dado cru (ex: O CSM precisa ver se o e-mail redigido pela IA ficou mal formatado no nome da pessoa):
- O CSM deve clicar em um botão "Solicitar Acesso Não-Mascarado".
- O sistema exibe um modal exigindo a digitação do ID do Ticket de Suporte.
- Este clique dispara um log gravíssimo (`impersonation.pii.revealed`) enviado em tempo real ao canal de #security-alerts do CISO do BirthHub 360.

## 4. Retenção de Logs de Acesso
Em conformidade com o Art. 15 do Marco Civil da Internet e artigos de trilha de auditoria da LGPD, o log de quem do BirthHub acessou qual Tenant, quando, e o que "desmascarou", não pode ser apagado nem mesmo pelo administrador do banco de dados (armazenado em WORM storage - Write Once, Read Many) pelo prazo mínimo de 5 anos.
