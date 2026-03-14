# Política de Dados de Tenant Deletado (Tenant Deletion Policy)

Este documento estabelece as diretrizes e regras sobre o que acontece com os dados e recursos de uma organização quando o seu tenant é deletado (ou cancelado) na plataforma do BirthHub360.

## 1. Escopo e Propósito

Esta política detalha a estratégia adotada para exclusões lógicas (Soft Delete) e exclusões físicas (Hard Delete/Purge), além dos procedimentos exigidos para manter conformidade legal com legislações de proteção de dados, especialmente a Lei Geral de Proteção de Dados (LGPD - Brasil).

As regras aplicam-se a todos os dados transacionais (pedidos, clientes, faturas), metadados (logs de auditoria, históricos), arquivos (anexos de S3, avatares), configurações, e dados pessoais dos usuários pertencentes ao tenant.

## 2. Abordagem: Soft Delete (Exclusão Lógica)

Quando uma solicitação de exclusão (via usuário admin ou cancelamento comercial) é iniciada, o processo **não destrói imediatamente os dados**.

1.  **Ação Imediata (T=0):** O registro principal do tenant (tabela `tenants` ou `organizations`) recebe um timestamp preenchido na coluna `deleted_at`.
2.  **Isolamento (Desativação):** A partir deste momento, o RLS (Row-Level Security) da aplicação e os middlewares devem garantir que nenhum usuário (ativo ou pendente) desse tenant possa fazer login na plataforma ou acessar as APIs associadas à organização (Retorno 403 Forbidden ou encerramento de sessão forçado). O status do tenant torna-se inativo (ex: `INACTIVE`, `PENDING_DELETION`).
3.  **Filtragem de Consultas Globais (Views de Backoffice/Support):** Consultas gerenciais devem sempre aplicar um filtro de segurança global `WHERE deleted_at IS NULL`, exceto quando explicitamente solicitado e permitido para auditoria, suporte ou faturamento, mascarando dados de identificação pessoal.
4.  **Preservação Temporária:** Os dados permanecem na base de dados (e backups em S3) durante uma **Janela de Retenção de 30 Dias (Purge Schedule)**, permitindo reversões (undelete) em caso de erro acidental, disputa comercial ou renovação contratual.
5.  **Desassociação de Cartões (Billing):** Qualquer dado financeiro atrelado à Stripe (ou processador de pagamentos) relacionado à assinatura contínua do cliente deve ser imediatamente cancelado ou pausado.

## 3. Abordagem: Purge Schedule (Exclusão Física)

A purga (Hard Delete) é irreversível. Após a expiração da Janela de Retenção de 30 dias (T+30), o sistema deve acionar automaticamente (via job agendado em background) a deleção definitiva em cascata.

1.  **Exclusão em Cascata do Banco (Database Purge):** As chaves estrangeiras (Foreign Keys) na modelagem Multi-Tenant baseada em RLS devem usar `ON DELETE CASCADE`. O job de Purge apaga o registro na tabela `tenants`, e a deleção se propaga atomicamente para todos os registros em tabelas filhas (usuários, registros de negócio, transações, metadados).
2.  **Purga de Armazenamento de Arquivos (Storage Purge - S3):** Tarefas assíncronas dedicadas devem iterar sobre todos os buckets do AWS S3 ou CDN e apagar permanentemente anexos, relatórios, logotipos ou qualquer blob de dados prefixado com o UUID do tenant excluído (ex: `s3://bucket/tenants/{tenant_id}/*`).
3.  **Notificações a Terceiros:** Ações de revogação/descadastramento e deleção via webhooks em parceiros (ex: Stripe, SendGrid, Mixpanel) são acionadas, assegurando que cópias do Perfil da Empresa (ex: Customer Profile e Usage Logs) sejam descartadas.
4.  **Auditoria do Purge:** Um log de auditoria permanente (armazenado externamente, ou em um schema restrito) registra o sucesso e a data/hora exata em que o purge do tenant `tenant_id` foi finalizado, juntamente com a assinatura (hash) do executor (sistema automatizado ou administrador que invocou a ação).

## 4. Conformidade Legal (LGPD e Retenção de Logs)

Sob a égide da Lei Geral de Proteção de Dados (LGPD) e normativas fiscais, alguns dados são isentos da purga completa por motivos regulatórios.

1.  **Dados Pessoais Sensíveis (PII):** A deleção é imperativa para e-mails, nomes completos, telefones de clientes e usuários, endereços de IPs transacionais e qualquer dado pessoal submetido ao longo da operação do cliente na plataforma, atendendo ao Direito de Apagamento / Esquecimento (Art. 18, inciso VI). O processo de Purge lida com isso.
2.  **Exceções de Retenção (Logs Financeiros e Tributários):** Os dados estritamente necessários ao cumprimento de obrigação legal (Art. 16, inciso I) não podem ser excluídos. Faturas fiscais já emitidas, registros de pagamento em gateway (NF-e/NFS-e) e faturamentos originados pelo BirthHub360 a esse cliente serão preservados pelos períodos legais cabíveis (no Brasil, 5 anos pelo Código Tributário Nacional).
3.  **Logs de Auditoria do Sistema (Audit Trail):** Como o log de auditoria serve à segurança (mitigação de fraudes, rastreio de crimes cibernéticos ou incidentes de segurança), ele pode ser retido (via anonimização de payloads ou sob base legal de Legítimo Interesse / Conformidade) por até 5 a 6 meses após o término do contrato, em cold-storage (arquivamento profundo), antes da deleção permanente (Purge dos Logs Antigos).
4.  **Direito dos Titulares:** Qualquer requisição de portabilidade de dados (Art. 18, inciso V) e deleção imediata solicitada pelo cliente por motivos cabíveis na lei (ex: Titular não aprova novos termos do SaaS) acionará um processo manual (Data Subject Access Request - DSAR) sobrepondo o Soft Delete padrão, pulando a retenção de 30 dias para os dados enquadrados, agilizando o Purge e anonimização obrigatórios.
