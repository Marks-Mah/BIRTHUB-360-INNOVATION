# ADR-025: Arquitetura de Billing Baseado em Uso (Metering)

## Status
Aceito

## Contexto
O modelo de precificação híbrido do BirthHub360 (ADR-024) exige que o sistema cobre uma taxa fixa mensal mais um valor variável baseado no uso extra (overage) dos Agentes de IA. Precisamos definir a arquitetura técnica de como esse uso variável (ex: tokens de LLM, execuções de automação) será registrado, agregado e faturado.

## Decisão
Implementaremos uma arquitetura de "Metered Billing" assíncrona baseada em **Event Sourcing** e **Batching** para a API do Stripe (`stripe.billing.MeterEvents`), adotando os seguintes princípios:

1. **Granularidade:**
   - A menor unidade mensurável (primitive) no backend será a `AgentInteraction` (ou *run/token count*).
   - O Stripe receberá os dados de consumo em uma métrica unificada: `ai_interactions_overage`.

2. **Latência de Reporte:**
   - O sistema não fará uma requisição HTTP ao Stripe para cada ação do usuário (isso aumentaria a latência e estouraria os rate limits da API do Stripe).
   - Adotaremos **Agrupamento (Batching)**. O uso será gravado em Redis e, a cada X horas (ou quando a franquia estourar internamente), um cronjob fará a consolidação no banco PostgreSQL (tabela `tenant_usage`) e o envio assíncrono consolidado para o Stripe Metering.

3. **Precisão e Custo (Tolerância a Perdas):**
   - A precisão em faturamento baseado em uso é crítica para não haver double charge ou under-counting expressivo.
   - Como estamos contando interações e tokens, priorizamos o *At-Least-Once Delivery* internamente. É melhor perdoar 0,5% de perda de uso do que bloquear uma esteira inteira por indisponibilidade momentânea do serviço de contabilidade.
   - Enviaremos o evento de uso com a tag de idempotência `idempotency_key` correspondente ao ID da transação no nosso banco.

## Alternativas Consideradas
- **Contagem Síncrona:** Atualizar a fatura no Stripe de forma síncrona a cada inferência. *Rejeitado* por causa da latência inaceitável gerada ao usuário final e custo de chamadas de API.
- **Cobrança Pré-paga (Créditos):** Usuários compram pacotes de créditos antes de usar. *Rejeitado* por criar muita fricção B2B ("Top-up friction"). O modelo pós-pago (overage) é mais aderente ao crescimento orgânico.

## Consequências
- A necessidade de uma arquitetura robusta de Redis + Cronjobs para agregação aumenta a complexidade operacional da Fila de Mensagens.
- Exige o desenvolvimento de um painel de UI claro para que o cliente acompanhe o uso do período atual antes que a fatura feche (evitando surpresas).
