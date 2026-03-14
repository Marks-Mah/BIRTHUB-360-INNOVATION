# Política de Edição de Prompts (Prompt Governance)

No BirthHub360, os *System Prompts* são efetivamente o "código-fonte" que governa o comportamento cognitivo dos agentes de IA. Uma alteração maliciosa ou mal testada em um prompt pode causar desde uma mudança inofensiva no tom de voz até vazamentos de dados ou quebras de workflow (ADR-014).

Esta política estabelece os controles de acesso, fluxos de aprovação e requisitos de auditoria para a edição de Prompts através do Agent Studio.

## 1. Níveis de Prompts

Para fins de governança, os prompts são divididos em duas categorias:

*   **Prompts Core (Plataforma):** Escritos pela equipe de engenharia do BirthHub360. Definem as guardrails fundamentais (ex: "Nunca revele que você é uma IA da OpenAI", "Formate a saída em JSON"). **Estes prompts não podem ser editados pelos usuários/tenants.**
*   **Prompts de Negócio (Tenant):** Configurados pelo usuário do tenant. Definem a persona, as regras de atendimento e os objetivos do agente (ex: "Você é um vendedor amigável da empresa X").

## 2. Controle de Acesso (Quem Pode Editar?)

A edição de Prompts de Negócio no Agent Studio é regida por controle de acesso baseado em função (RBAC):

*   **Administrador do Tenant (Admin):** Permissão total para criar, editar, testar e publicar prompts em produção.
*   **Gerente de Negócios (Manager):** Permissão para editar prompts em ambiente de "Rascunho" (Draft) e testá-los no Simulador (Playground). Pode solicitar a publicação, mas não pode publicá-los diretamente em produção.
*   **Agentes de Suporte / Operadores (Viewer):** Apenas leitura (pode ver o prompt do agente para entender por que ele tomou uma decisão, mas não pode alterar).

## 3. Fluxo de Aprovação (Approval Workflow)

Para evitar que erros humanos cheguem aos clientes finais, a plataforma exige um fluxo de revisão para agentes que operam com capacidade `write` ou `notify` (Agentes de Alto Risco).

1.  **Edição no Draft:** O `Manager` edita o prompt do "Agente de Reembolso" no Studio e o testa no Simulador.
2.  **Submissão (Request Approval):** O `Manager` clica em "Solicitar Publicação". O sistema salva o novo prompt como versão `v1.2-draft`.
3.  **Revisão (Review):** O `Admin` recebe uma notificação. O Agent Studio apresenta uma interface de "Diff" (Visualização de Diferenças) mostrando exatamente quais palavras foram adicionadas ou removidas do prompt antigo para o novo.
4.  **Testes Automatizados (Opcional para Enterprise):** Se o tenant tiver testes de assertividade de prompt configurados, o CI interno do Studio roda os testes de regressão.
5.  **Aprovação e Deploy:** O `Admin` clica em "Aprovar e Publicar". A versão do agente muda (PATCH ou MINOR) e o novo prompt entra em vigor imediatamente para novas execuções.

*(Nota: Tenants no plano Free/Starter não possuem fluxo de aprovação complexo; o próprio Admin faz as edições diretas).*

## 4. Auditoria e Rastreabilidade (Audit Trail)

Toda alteração de prompt é um evento de segurança corporativa. O Agent Core deve garantir que:

*   **Versionamento Imutável:** Cada vez que um prompt é publicado, uma nova versão (snapshot) é salva no banco de dados de configurações. Prompts antigos nunca são deletados fisicamente; eles recebem a flag `is_active=False` (ou são versionados pelo `manifest.yaml`).
*   **Log de Auditoria:** A ação de publicação gera um evento no sistema global de auditoria contendo:
    *   `timestamp` (Quando ocorreu)
    *   `user_id` (Quem propôs a alteração)
    *   `approver_id` (Quem aprovou)
    *   `agent_id` (Qual agente foi modificado)
    *   `diff_hash` ou payload com as alterações realizadas.
*   **Rollback:** A UI do Agent Studio deve fornecer um botão "Reverter para Versão Anterior" para que o Admin possa desfazer imediatamente um deploy de prompt que causou problemas em produção (One-Click Rollback).
