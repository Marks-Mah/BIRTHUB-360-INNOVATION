# Análise de Sampling de Telemetria (Custo vs. Precisão) - BirthHub 360

## Objetivo
Determinar a estratégia técnica para enviar dados de telemetria de produto sem estourar o orçamento de ferramentas analíticas (que cobram por MTU - Monthly Tracked Users ou Volume de Eventos), à medida que a plataforma escala para dezenas de milhares de clientes B2B operando milhões de interações de IA.

## O Problema do 100% Tracking
Em ferramentas B2B, as interações de interface são muito menores em volume do que as ações do backend (agentes rodando CRON jobs).
Se a plataforma gravar 1 evento para cada "Lead Mapeado" por um Agente SDR, uma única conta processando 50.000 leads por dia pode gerar 1.5 milhão de eventos ao mês, causando faturas exorbitantes no Mixpanel ou Datadog.

## Estratégia de Sampling Sugerida (Dynamic Sampling)

### 1. Frontend & Onboarding (0% Sampling = Rastrear 100%)
- **Escopo:** Eventos do funil de conversão, Onboarding Wizard, pagamentos.
- **Justificativa:** O volume de usuários navegando no painel (Humanos) é relativamente baixo (centenas/milhares por dia). Precisamos de precisão de 100% para funis de Drop-off. Amostrar 10% desses dados destruiria análises estatísticas em features novas e esvaziaria relatórios de A/B testing.

### 2. Backend Core Events (Eventos Agregados - Batching)
- **Escopo:** Execução de ferramentas repetitivas (Tools executadas pelos Agentes em Loops).
- **Justificativa:** A telemetria não pode virar o log do sistema (isso é trabalho pro CloudWatch/ELK). Em vez de disparar `tool_executed` 50.000 vezes, o backend do BirthHub acumula isso num cache local (Redis) e, a cada hora, dispara 1 único evento de telemetria `agent_bulk_processed` com a propriedade `{"batch_size": 50000, "success_rate": 0.98}`.

### 3. Backend High-Volume Logs (10% Sampling)
- **Escopo:** Eventos de depuração em produção, cliques secundários em logs, requisições de mouse hover em relatórios densos (Heatmaps).
- **Justificativa:** Para saber se um botão novo está sendo usado ou ignorado, rastrear 1 em cada 10 sessões (10% sampling) já fornece significância estatística num cenário de alto tráfego, cortando os custos de ingestão em 90%.

## Conclusão Arquitetural
A camada de API Gateway deve suportar uma flag `X-Telemetry-Sample-Rate` baseada no tenant. Contas grandes (Enterprise) que distorcem as médias globais por força bruta terão seus eventos de baixo valor em background amostrados em 1%, enquanto contas Starter/Trial serão rastreadas em 100% para monitoramento de retenção inicial.
