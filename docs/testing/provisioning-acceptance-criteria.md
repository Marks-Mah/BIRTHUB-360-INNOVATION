# Critérios de Aceite para o Fluxo de Provisionamento (Automático)

Este arquivo especifica o comportamento que a infraestrutura (API, Banco de Dados, Integrações de Billing, etc.) deve apresentar durante a criação e provisionamento automatizado de uma nova organização (Tenant) e seus membros fundadores no momento do registro (Sign Up).

Nenhum desenvolvedor deve precisar intervir ou aprovar manualmente o ingresso de uma nova organização que complete o fluxo comercial. Tudo deve ser guiado via APIs testáveis e determinísticas.

## 1. Critérios Fundamentais (Fluxo de Self-Service Sign-up)

**Cenário A: O criador do Tenant (`Founder/Owner`) entra, digita o nome e paga o plano escolhido (Stripe).**
1.  **Isolamento Garantido (`AC-01`):** A nova organização recebe imediatamente um `id` (UUIDv4 seguro e irrepetível) e a sua respectiva entrada na tabela `organizations`. Todas as chamadas posteriores usando o token desse usuário herdam este `id` na camada RLS. Nenhuma interferência manual é necessária para a inserção.
2.  **Associação Imediata (`AC-02`):** O `Founder` é registrado como `Owner` (Nível máximo de hierarquia) na tabela de `members` dessa organização, atomicamente vinculando seu `user_id` e o `tenant_id` em uma única transação no banco.
3.  **Ambiente Pré-Configurado (`AC-03`):** Se existirem configurações padrões (ex: `roles` padrões como "Viewer", "Editor", `notification_settings` padrão, templates, tags), estas devem ser inseridas pela API através de _seeders_ determinísticos no momento do `COMMIT` da transação de registro. A organização entra funcional.
4.  **Assinatura e Sincronismo Comercial (`AC-04`):** Uma vez que o webhook de pagamento do Stripe/Asaas (ex: `checkout.session.completed`) bate na nossa infra, o `status` do Tenant deve migrar de `PENDING_PAYMENT` para `ACTIVE`. A partir desse microssegundo, a organização e seus convidados ganham acesso total às features pagas do plano. Sem isso, os membros recebem acesso negado.

## 2. Aceites de Testabilidade em CI/CD (Sem Intervenção Humana)

Para garantir que o fluxo acima funcione e seja resiliente a falhas temporárias (Race Conditions), os seguintes cenários de integração devem estar implementados na suíte E2E:

*   **Test-Case 1:** O script envia requisições simultâneas (Concorrência/Paralelismo) para criar a mesma organização (mesmo *slug* ou e-mail de criador). O banco DEVE responder com uma única criação bem-sucedida e as demais requisições abortarem com HTTP 409 (Conflict). O *slug* ou e-mail principal nunca pode ser duplicado (Constraints Únicas).
*   **Test-Case 2:** A API falha em inserir as configurações padrões (AC-03) por erro temporário na rede ou falha de query interna. O teste DEVE comprovar que toda a operação, desde a criação da organização até a conta do criador, foi revertida (`ROLLBACK`) atomicamente. Organizações "em estado quebrado/zumbi" não podem existir na tabela `organizations`. O script valida o Zero-State novamente.
*   **Test-Case 3:** Um webhook simulado (`HTTP POST /webhooks/stripe`) entra no sistema antes mesmo da interface finalizar o redirecionamento do cliente. A aplicação DEVE possuir IDEMPOTÊNCIA: Processar o webhook, definir a organização como `ACTIVE` e se o cliente atualizar a tela ou enviar outro webhook repetido, a API ignora e retorna HTTP 200 OK sem inserir faturas duplicadas. O provisionamento é selado e não repete.