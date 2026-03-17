# ADR-018: Motor de Políticas (Policy Engine) para Controle de Agentes

## Status
Proposto

## Contexto
O ecossistema BirthHub360 permite que os tenants instalem e configurem agentes com diversas capacidades (ler bancos, gravar dados, enviar e-mails, cobrar cartões). No entanto, nem todos os tenants têm os mesmos privilégios (baseado no plano de assinatura) e nem todos os administradores querem que seus agentes façam tudo o que são capazes de fazer.

Precisamos de um **Policy Engine** centralizado e performático que atue como o "Guarda de Trânsito" (Gatekeeper) em tempo de execução (runtime). Ele deve interceptar toda tentativa de um agente de usar uma Tool ou acessar uma Capacidade e responder rapidamente: **Permitido (Allow)** ou **Negado (Deny)**.

As principais decisões arquiteturais são:
1.  O modelo padrão será baseado em *Allow-List* (tudo bloqueado exceto o que é explicitamente permitido) ou *Deny-List* (tudo liberado exceto o que é bloqueado)?
2.  A avaliação será *Eager* (avaliar tudo no momento do instanciamento do agente) ou *Lazy* (avaliar apenas no momento em que a Tool é invocada)?

## Decisão

Adotaremos um modelo baseado em **Allow-List Eager-Lazy Híbrido** implementado usando um framework de políticas rápido (ex: OPA - Open Policy Agent ou uma implementação nativa e cacheada no Redis).

### 1. Modelo de Avaliação: Allow-List (Padrão Negado)
Por segurança (Secure by Default), se uma política não existir explicitamente para permitir uma ação, a ação é **Negada**.

A hierarquia de permissão funciona em três níveis (AND lógico):
1.  **Plano do Tenant (Plataforma):** O tenant assinou o plano "Pro" que permite a tool `send_sms_twilio`?
2.  **Configuração do Tenant (Admin):** O admin da empresa ativou a permissão para essa tool globalmente no painel dele?
3.  **Manifesto do Agente:** O agente foi desenvolvido pedindo essa tool em seu `manifest.yaml`?

Se qualquer um desses níveis for `False` ou ausente, a execução da tool falha com `PolicyViolationError`.

### 2. Estratégia de Avaliação: Eager vs Lazy

Para balancear segurança com performance (latência de execução do LLM), adotaremos um modelo **Híbrido**:

*   **Eager Evaluation (No Init do Job):**
    *   Quando o orquestrador acorda o Agente para processar uma mensagem, ele faz uma consulta ao Policy Engine: *"Quais ferramentas este agente pode usar neste tenant neste exato momento?"*.
    *   O Policy Engine cruza o Manifesto do Agente com a Allow-List do Tenant e retorna a lista final de Tools permitidas.
    *   **Benefício:** O orquestrador **NÃO** inclui a descrição (prompt) das tools proibidas na chamada (contexto) para a OpenAI/Anthropic. Se o agente não pode enviar SMS, ele nem sequer sabe que a ferramenta de SMS existe. Isso economiza tokens, evita alucinações (o LLM tentando adivinhar como usar uma tool que lhe foi negada) e protege contra Prompt Injections que tentam forçar o uso de ferramentas desligadas.

*   **Lazy Evaluation (No Momento da Chamada da Tool):**
    *   Apesar do Eager Evaluation esconder a tool do LLM, um agente malicioso (ou um bug no orquestrador) poderia tentar enviar um JSON chamando a tool proibida de qualquer forma.
    *   Portanto, no exato milissegundo antes da função Python da tool ser executada, o decorador do framework de tools faz uma verificação rápida no cache (memória local do worker ou Redis): *"A tool `send_sms_twilio` está na lista permitida desse contexto?"*. Se não estiver, lança exceção imediata.
    *   O Lazy Evaluation também avalia limites dinâmicos de Rate Limit e orçamento financeiro (Spend Limits) que podem ter se esgotado *durante* a execução do agente.

## Consequências
*   **Positivas:**
    *   **Defense in Depth:** O modelo Allow-List previne acidentes. O modelo Híbrido protege o LLM de se confundir (economia de tokens) e protege a infraestrutura de chamadas forjadas.
    *   Facilita a criação de "Planos de Assinatura" diferenciados (Feature Flagging natural via Policy Engine).
*   **Negativas:**
    *   O Policy Engine vira um ponto único de falha e um gargalo de latência. Ele precisa ser extremamente rápido (sub-milissegundo). Isso exige que as políticas sejam cacheadas no banco Chave-Valor (Redis) do Tenant em vez de reavaliadas via SQL no banco de dados relacional a cada passo.

## Referências
*   Item 4.6.J1 do Ciclo 4 (JULES)
*   [ADR-017: Tools Framework](./ADR-017-tools-framework.md) (Onde as políticas são efetivamente aplicadas/enforced).
