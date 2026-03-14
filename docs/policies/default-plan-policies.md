# Políticas Padrão por Plano de Assinatura

Esta política descreve as configurações fundamentais do **Policy Engine** (ADR-018) para cada nível de assinatura (Free, Pro, Enterprise) no SaaS BirthHub360. Estas políticas delimitam as capacidades, ferramentas e limites de recursos que os agentes de um tenant podem acessar "out-of-the-box".

## Princípios da Política de Planos

1.  **Segurança por Escassez:** Planos de entrada (Free/Trial) possuem capacidades mínimas para limitar danos financeiros e de reputação em caso de abuso por atores maliciosos criando contas falsas.
2.  **Monetização do Valor (Value-Based Pricing):** Ações de alto valor (como alterar o estado do mundo via ferramentas de `write` ou acionar integrações caras de `execute`) são reservadas para clientes pagantes.
3.  **Transparência:** Se um agente de um tenant Free tentar usar uma ferramenta Pro, o Agent Core falha graciosamente com um erro `403 FeatureRequiresUpgrade` que a interface do usuário (UI) pode interpretar para fazer upsell.

## 1. Plano Free (Trial / Starter)

O foco do plano gratuito é demonstração de valor (sandbox) com risco zero para a plataforma e para o cliente.

*   **Capacidades Permitidas (Allow-List):** `read` apenas.
*   **Capacidades Negadas (Deny-List):** `write`, `execute`, `notify`. (Agentes Free não podem alterar dados no banco, fazer chamadas API para o mundo exterior, nem enviar e-mails/SMS).
*   **Ferramentas (Tools) Habilitadas:**
    *   Todas as ferramentas internas da Categoria A (ver `docs/analysis/tool-cost-latency.md`).
    *   Ferramentas de RAG (`search_memory`) limitadas a documentos pequenos/índices limitados.
*   **Limites de Execução (Runtime):**
    *   **Timeout Máximo por Job:** 30 segundos.
    *   **Rate Limit:** 10 interações por hora por tenant.
    *   **Modelos Base LLM:** Apenas modelos "rápidos/baratos" (ex: `gpt-3.5-turbo`, `claude-3-haiku`). O Policy Engine sobrescreve configurações de manifesto que exijam modelos caros.
*   **Comportamento em Edge Cases:** Se um agente no plano Free for acionado para um workflow que exige `write` (ex: atualizar ticket), o Policy Engine intercepta a chamada no início (Eager Evaluation), remove a tool de `write` do contexto do LLM, e instrui o LLM via prompt: *"Você está em modo leitura. Diga ao usuário que você rascunhou a resposta, mas que a ação requer upgrade."*

## 2. Plano Pro (Profissional / Growth)

O plano padrão para empresas que automatizam workflows reais.

*   **Capacidades Permitidas:** `read`, `write`, `execute` (limitado), `notify` (com limites de anti-spam).
*   **Ferramentas (Tools) Habilitadas:**
    *   Todas as ferramentas da Categoria A e B.
    *   Ferramentas da Categoria C (Third-Party APIs pagas, como Twilio ou Serper) são permitidas, **desde que** o tenant tenha configurado sua própria chave de API (Bring Your Own Key - BYOK) ou tenha saldo de créditos na plataforma.
*   **Limites de Execução (Runtime):**
    *   **Timeout Máximo por Job:** 120 segundos.
    *   **Rate Limit:** 1.000 interações por hora (ou conforme contratado).
    *   **Modelos Base LLM:** Acesso a modelos "inteligentes" (ex: `gpt-4o`, `claude-3-opus`), sujeito aos limites de consumo de tokens do plano.
*   **Comportamento em Edge Cases:** Ferramentas de notificação (`send_email`) passam por um filtro de heurística anti-spam rígido. Se a taxa de falha/bounce de um tenant Pro for alta, a capacidade `notify` é suspensa via Policy Engine dinâmico até revisão.

## 3. Plano Enterprise (Custom / Dedicated)

O plano focado em conformidade rígida, escala massiva e fluxos de trabalho altamente customizados.

*   **Capacidades Permitidas:** Personalizáveis por agente e por função de usuário (Custom RBAC). O admin do tenant pode criar policies granulares (ex: "Agente de Vendas tem `write` apenas na tabela de `Leads`, mas não em `Contracts`").
*   **Ferramentas (Tools) Habilitadas:**
    *   Todas as ferramentas nativas (Categorias A, B, C).
    *   Permissão para usar **Ferramentas Customizadas (Custom Tools)**: O tenant pode fornecer código Python ou containers Docker (via webhook) que o orquestrador chamará.
*   **Limites de Execução (Runtime):**
    *   **Timeout Máximo por Job:** Customizado (pode chegar a 15 minutos para jobs assíncronos pesados).
    *   **Rate Limit:** Garantido via SLAs (Sem rate limit genérico, apenas limites de infraestrutura acordados).
    *   **Modelos Base LLM:** Pode incluir instâncias dedicadas de modelos abertos (Llama 3) ou Provisioned Throughput em provedores de nuvem para garantir latência zero.
*   **Comportamento em Edge Cases:** No plano Enterprise, o Policy Engine pode ser configurado no modo **"Human-in-the-Loop Obrigatório" (HITL)** para ações destrutivas. Exemplo: Uma policy pode ditar que qualquer uso da tool `process_refund` (mesmo permitida e sem erros) pausa a execução e emite um alerta para um gerente no Slack, aguardando um clique de aprovação antes de o Policy Engine devolver a execução ao agente.

## Tabela Resumo do Policy Engine

| Recurso / Política       | Plano FREE         | Plano PRO                   | Plano ENTERPRISE            |
| :----------------------- | :----------------- | :-------------------------- | :-------------------------- |
| **Capacidade Padrão**    | `read`             | `read, write, notify`       | Custom (RBAC Granular)      |
| **Ferramentas Pagas (C)**| ❌ Negado          | ✅ Permitido (via Créditos) | ✅ Permitido                |
| **LLMs Premium (GPT-4)** | ❌ Downgrade forçado| ✅ Permitido                | ✅ Permitido (Dedicado opc) |
| **Max Timeout/Job**      | 30s                | 120s                        | Ilimitado / Custom          |
| **Hitl (Aprovação)**     | N/A                | Recomendado                 | Mandatório configurável     |
