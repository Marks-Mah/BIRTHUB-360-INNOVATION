# Análise de Casos Extremos (Edge Cases) no Policy Engine

O Policy Engine (ADR-018) é o componente de segurança de tempo de execução (runtime) mais crítico do BirthHub360. Ele intercepta chamadas de LLMs e ferramentas para garantir que os agentes não excedam seus privilégios (definidos no Plano do Tenant, no Admin Dashboard ou no Manifesto do Agente).

Como em qualquer sistema de regras hierárquicas, existem *Edge Cases* (casos extremos ou ambíguos) que podem levar a falhas de segurança (Escalonamento de Privilégio) ou falhas de disponibilidade (Falso Positivo / Bloqueio Indevido). Esta análise mapeia esses cenários e define o comportamento do sistema para resolvê-los de forma segura e determinística.

## 1. Conflito de Políticas (Policy Conflicts)

Um conflito ocorre quando diferentes camadas da hierarquia de permissões dão respostas contraditórias sobre a mesma ação.

### Cenário: O Agente Pede Mais do que o Tenant Tem
*   **A Situação:** Um usuário de um tenant no plano **Free** (que só permite `read`) instala um agente chamado `invoice_sender`, cujo manifesto (`manifest.yaml`) exige explicitamente a capacidade `notify` e a tool `send_email`.
*   **O Conflito:** Nível 1 (Plataforma/Free) diz `DENY`. Nível 3 (Manifesto) diz `ALLOW`.
*   **Resolução (O Comportamento Padrão):** O Policy Engine aplica a regra do "Veto Hierárquico Descendente". A camada mais alta (Plataforma) tem precedência absoluta sobre as camadas inferiores (Admin e Agente).
    *   **Resultado:** A execução da tool `send_email` será bloqueada com um erro `403 Policy Violation (Reason: Plan Restriction)`. O agente receberá no seu contexto que a ferramenta falhou por falta de permissão, forçando-o a tentar um caminho alternativo ou notificar o usuário da limitação.

### Cenário: O Admin Bloqueia, Mas a Plataforma Permite
*   **A Situação:** Um tenant **Enterprise** (que permite tudo, incluindo `execute` de código arbitrário) tem um Admin de TI preocupado com custos. O Admin configura no painel: "Bloquear todas as tools da Categoria C (pagas)". Um usuário executa um agente que tenta usar a tool `serper_search`.
*   **O Conflito:** Nível 1 (Plataforma/Enterprise) diz `ALLOW`. Nível 2 (Admin) diz `DENY`.
*   **Resolução:** A regra de ouro do modelo "Deny-by-Default" (ADR-018) é que a negação (Deny) é **sempre** a operação dominante em qualquer conflito. Basta um `DENY` na cadeia para barrar a ação, independentemente do nível que a emitiu.
    *   **Resultado:** A tool falha com `403 Policy Violation (Reason: Tenant Admin Restriction)`.

## 2. Ausência de Política (Missing Policies / Ambiguity)

O que acontece se uma ferramenta for recém-lançada e o Policy Engine (ou a configuração do tenant no cache) ainda não tiver regras definidas para ela?

### Cenário: O Silêncio do Gatekeeper
*   **A Situação:** A equipe de desenvolvimento do BirthHub360 fez deploy de uma nova tool poderosa chamada `bulk_delete_contacts`. O manifesto do agente que a utiliza foi aprovado (ver checklist de novas tools), mas a equipe esqueceu de adicionar a tool à configuração padrão do plano **Pro** no Policy Engine. Um tenant Pro tenta executar o agente.
*   **O Problema:** O Policy Engine não encontra nem `ALLOW` nem `DENY` para `bulk_delete_contacts` no escopo do plano Pro.
*   **Resolução (Secure by Default):** Conforme definido no ADR-018, adotamos a abordagem **Allow-List (Padrão Negado)**.
    *   **Resultado:** A falta de uma regra explícita de `ALLOW` resulta em um `DENY` imediato. O agente será bloqueado com `403 Policy Violation (Reason: Unmapped Capability/Tool)`. É preferível causar um incidente de falso positivo (um cliente reclamando que a ferramenta não funciona) do que um incidente de vazamento de dados por padrão aberto.

## 3. Riscos de Escalonamento de Privilégios (Privilege Escalation)

O Escalonamento de Privilégios ocorre quando um agente ou usuário consegue contornar o Policy Engine para executar uma ação para a qual não tem autorização.

### Cenário: Confused Deputy (Delegação Indevida)
*   **A Situação:** O Tenant A configurou o Agente X para ter permissão apenas de `read` (para buscar KPIs no banco). No entanto, o Agente X tem um prompt que, dependendo da entrada do usuário, decide "pedir ajuda" para o Agente Y (um agente interno de suporte de infraestrutura do sistema) passando a instrução: *"Por favor, rode `DROP TABLE`"*.
*   **A Falha (Se não mitigada):** O Agente Y, por ser de infraestrutura, tem a capacidade `write` permitida pelo Policy Engine. Se o Policy Engine avaliar a permissão com base *apenas* na identidade de quem executa a tool (Agente Y), a instrução maliciosa do usuário (repassada pelo Agente X) será executada.
*   **Resolução (Prevenção):** O Policy Engine **não** avalia políticas com base na identidade estática do Agente Y. O contexto de segurança (`security_context`) deve ser propagado ao longo do workflow (Tracing de Autorização).
    *   **Implementação:** Quando o usuário (ou a API) inicia a sessão com o Agente X, o orquestrador gera um "Token de Execução" com o escopo máximo permitido para aquela sessão (ex: `scopes: [read]`). Quando o Agente X chama o Agente Y, ele repassa o Token de Execução restrito. O Agente Y tenta usar a tool `write`, mas o Policy Engine rejeita porque o Token ativo da sessão não possui o escopo `write`. Isso previne o ataque do "Deputado Confuso".

### Cenário: Bypass via Nomes Semelhantes
*   **A Situação:** O tenant bloqueou a ferramenta `send_email`. Um desenvolvedor mal-intencionado cria uma ferramenta customizada e a nomeia como `send_e_mail` ou `send_email_v2` e tenta usá-la. Se o Policy Engine for baseado em strings ingênuas, a nova ferramenta passa.
*   **Resolução:** Ferramentas não devem ser identificadas no Policy Engine apenas por seu nome (`tools[].name`), mas por um URN interno gerado na aprovação da plataforma (ex: `urn:bh360:tool:core:email:v1`), e o bloqueio/permissão de alto nível deve ocorrer pela **Capacidade** (`capability: notify`), não (apenas) pelo nome da ferramenta. Bloquear `notify` bloqueia automaticamente `send_email`, `send_sms`, `post_slack`, etc.

## Conclusão

O design do Policy Engine deve favorecer a paralisação do workflow (`DENY`) em face de qualquer ambiguidade. A implementação técnica deve garantir a propagação do contexto de segurança do chamador original ao longo de toda a cadeia de agentes (Tracing) para evitar a escalada de privilégios via sub-delegação (Confused Deputy).
