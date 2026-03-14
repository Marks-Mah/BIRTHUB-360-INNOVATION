# Análise de Privacidade de Notificações - BirthHub 360

## Contexto e Risco
O BirthHub 360 opera como um ecossistema RevOps turbinado por IA que processa vastas quantidades de dados sensíveis (PII, contratos, conversas de vendas, deals) provenientes do CRM, E-mails e gravações de chamadas de seus clientes.
**O Risco:** Notificações push (mobile ou desktop) e E-mails transacionais (não criptografados fim-a-fim em trânsito/repouso na caixa postal do cliente) frequentemente contêm prévias de texto truncadas que podem "vazar" informações financeiras ou PII (Nome, Empresa, Telefone, Valor do Deal, Diagnóstico de Churn) em telas bloqueadas de smartphones ou para administradores de TI não autorizados lendo logs de servidores de e-mail corporativo.

## 1. Notificações Push (Mobile & Web)
### Risco e Mitigação (Payload Seguro)
*   **Ameaça (Threat Model):** O payload da notificação contém PII e é enviado através das redes de terceiros (Apple APNs ou Firebase/Google FCM), armazenado momentaneamente nos servidores deles e exibido na tela de bloqueio do celular de um Executivo de Vendas em um aeroporto (Shoulder Surfing).
*   **Política (Mitigação):**
    *   **Payload Oculto por Padrão (Opaque Notifications):** A notificação web push contém apenas o "Evento" e não os "Dados".
    *   **Padrão Incorreto:** "Seu Agente Churn Predictor alerta: O Cliente X (joao@empresax.com) cancelou o cartão e não renovará o contrato de $50k".
    *   **Padrão Seguro (LGPD Compliant):** "O Agente de Retenção encontrou um risco crítico no seu portfólio de Enterprise. Clique para visualizar detalhes seguros na plataforma".
    *   **Tratamento Técnico:** A notificação acorda o app (ou webapp), que autentica a sessão silenciosamente via token armazenado e busca o detalhamento real através da API HTTPS criptografada do BirthHub 360 (Pull strategy).

## 2. E-mails Transacionais
### Risco e Mitigação (Limpeza e Pseudonimização)
*   **Ameaça (Threat Model):** E-mails são texto plano ou HTML levemente ofuscado, e repousam em caixas postais mantidas por anos em backup por administradores de TI do cliente. Em caso de invasão de conta corporativa, os relatórios gerados pelos Agentes IA do BirthHub (Digeridos no E-mail) expõem instantaneamente todo o pipeline de vendas.
*   **Política (Mitigação):**
    *   **Restrição de Escopo e Dados Sensiveis (PII / Financeiro):**
        *   Não exibir "Valores de Negócios" nominais atrelados ao cliente no corpo de e-mails de notificação diária (Daily Digests).
        *   Usar apenas as Iniciais, Primeiros Nomes ou IDs de Oportunidades no lugar de Nomes Completos e Telefones. Exemplo: "O Lead J. Silva (ID #9213) da Empresa XPTO respondeu positivamente".
        *   Sempre utilizar o padrão de design CTA (Call-to-Action) seguro: Colocar as informações sumárias no e-mail com botões gigantes "Revisar as 15 respostas do Agente SDR agora", forçando a autenticação no dashboard onde a RLS (Row Level Security) e a trilha de auditoria protegem o acesso.

## Resumo e Ação
Qualquer novo agente criado que envolva o disparo proativo de mensagens para canais fora do ecossistema autenticado do BirthHub (Slack/Teams, E-mail, SMS, Web Push) deve passar pela revisão de segurança. O payload das notificações deve ser classificado em 3 níveis (Público, Interno/Anonimizado, Estritamente Confidencial) antes do envio. Dados Confidenciais exigem link autenticado.
