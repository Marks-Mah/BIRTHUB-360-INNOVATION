# Política de Ação ao Atingir o Budget (Hard Limit vs Graceful Degradation)

Esta política descreve o comportamento do orquestrador de agentes quando um Tenant atinge ou excede o seu limite financeiro ou de créditos ("budget") de uso no ciclo de faturamento mensal.

## 1. Monitoramento Contínuo
O serviço de Billing (`apps/billing`) verifica o saldo atualizado a cada requisição enviada ao Gateway (`apps/api-gateway`). O saldo é comparado contra dois limites ("Thresholds"): `Warning Limit` (80%) e `Hard Limit` (100%).

## 2. Abordagem: Graceful Degradation (Degradação Graciosa)

Sempre que possível, o BirthHub360 não interrompe abruptamente o fluxo de negócios do cliente. Se o limite de `Custo de Conectores Pagos` (DaaS) for estourado, o sistema:
*   **Ação:** Desativa temporariamente a injeção da ferramenta (Tool) cara no StateGraph dos agentes ativos.
*   **Efeito:** O Agente continua respondendo e operando, mas em vez de buscar no Clearbit, ele responde com: "Devido aos limites do plano, não posso buscar novos dados externos agora. Como posso ajudar com o que já temos?".
*   **Quando se aplica:** Agentes de Tier Medium, onde a ausência da API não quebra a promessa central de valor.

## 3. Abordagem: Hard Block (Bloqueio Total)

Algumas execuções não fazem sentido ou geram prejuízos diretos à infraestrutura se continuarem. Nestes casos, a execução é abortada no nível do Gateway (HTTP 402 Payment Required).
*   **Quando se aplica:**
    *   O Tenant ultrapassou o Hard Limit do cartão de crédito (Inadimplência Real).
    *   O Tenant não possui plano pago e ultrapassou a cota grátis mensal de LLM tokens.
    *   O Agente é de `tier:high` e o seu *único* propósito depende das ferramentas pagas (ex: "Mass Email Scraper").
*   **Notificação:** O proprietário do Tenant recebe um e-mail de "Account Suspended / Upgrade Required" e o webhook do agente falha com um log claro na interface do Dashboard.

## 4. Overage (Faturamento Excedente)
Para planos "Enterprise" com Overage habilitado (configuração ativa no Stripe), a regra de Hard Block é suspensa. O cliente concorda contratualmente em pagar pelo que exceder o limite base, sem interrupção de serviço, recebendo apenas alertas no painel de administração.
