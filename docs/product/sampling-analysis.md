# Análise de Sampling de Telemetria (100% vs Amostragem)

## O Problema do Volume
O BirthHub 360 projeta escalar para dezenas de milhões de mensagens geradas por IA por mês (Nível 3: 100k Tenants). Enviar um evento de analytics (ex: `Message Sent`) ao Mixpanel/Datadog para CADA mensagem recebida e respondida gerará uma fatura astronômica na ferramenta de telemetria e pode enfileirar o backend inutilmente.

## Cenários de Avaliação

### 1. Eventos Críticos de Negócio (100% Retenção - Sem Sampling)
- **Eventos:** `Tenant Created`, `Subscription Upgraded`, `Agent Deployed`.
- **Por quê:** Ocorrem com pouca frequência, mas têm alto valor para acompanhamento de funil e CS. Precisamos saber exatamente quem pagou e quem configurou a plataforma.

### 2. Eventos de UI do Dashboard (100% Retenção)
- **Eventos:** Cliques em "Adicionar Prompt", "Integrar CRM".
- **Por quê:** Volume controlado pelo número de Gestores online. Essencial para UX research.

### 3. Eventos de Tráfego Final / Interações de Bot (Amostragem / Sampling 10%)
- **Eventos:** `Chat Widget Opened`, `Message Processed by AI`.
- **Por quê:** São eventos de altíssimo volume. Para entender as tendências macro (Ex: O tráfego do site dos nossos clientes sobe à noite?), não precisamos de 1 milhão de pontos de dados. Analisar estatisticamente 10% (100 mil pontos) gera gráficos virtualmente idênticos com 10% do custo de SaaS.

## Decisão de Engenharia
As bibliotecas de envio de eventos (SDKs de frontend e backend) devem suportar configuração dinâmica de `sampleRate`. Eventos de máquina usarão `sampleRate: 0.1` (10%).
