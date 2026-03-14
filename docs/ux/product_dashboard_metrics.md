# Definição do Dashboard de Produto (Uso Interno) - BirthHub 360

## Objetivo
Definir o layout lógico e as fórmulas de cálculo do painel de controle que o **Time Interno de Produto (PMs, Diretoria)** acessará no Mixpanel/Grafana para monitorar a saúde da plataforma.

## Seção 1: Aquisição e Onboarding (Topo de Funil)

### 1. Taxa de Conclusão de Onboarding (TCO)
*   **Definição:** A proporção de novos usuários que terminam a configuração inicial e rodam seu primeiro Agente IA.
*   **Fórmula:** `(Total de Usuários que acionam 'agent_activated' na primeira sessão) / (Total de Usuários que disparam 'wizard_started')`
*   **Meta:** > 80%

### 2. Time To First Value (TTFV)
*   **Definição:** O tempo mediano que um usuário leva entre clicar em "Criar Conta" e ver o primeiro insight útil.
*   **Fórmula:** `Median(Timestamp de 'first_insight_viewed' - Timestamp de 'signup_completed')`
*   **Meta:** < 10 minutos.

## Seção 2: Engajamento e Adesão (Meio de Funil)

### 3. Stickiness (Aderência Diária/Semanal - DAU/WAU)
*   **Definição:** Mede o quão habitual a ferramenta se tornou.
*   **Fórmula:** `(Daily Active Users) / (Weekly Active Users)`
*   **Meta:** > 30% (Indicando que usuários acessam a plataforma pelo menos 2-3 vezes por semana).

### 4. Modo Auto-Pilot vs Rascunho
*   **Definição:** Mede a confiança na qualidade da IA do BirthHub.
*   **Fórmula:** `(Execuções com status='auto') / (Total de Execuções de Agentes)`
*   **Meta:** Aumentar 5% ao mês, partindo do baseline atual. (Mais Auto-pilot = Maior chance de renovação do contrato).

## Seção 3: Valor Entregue e Retenção (Fundo de Funil)

### 5. Horas Automatizadas Úteis (North Star Metric)
*   **Definição:** Conforme `product_north_star_metrics.md`.
*   **Fórmula:** `Sum(agent_execution_time_saved_seconds) * 0.85_fator_correcao`
*   **Visualização:** Gráfico de linha acumulado (Up and to the right) comparado com a semana anterior (WoW).

### 6. Net Revenue Retention (NRR) - Impacto do Produto
*   **Definição:** Quanto a receita existente cresceu ou encolheu, ignorando vendas novas (New Logos). É a métrica final do Product-Led Growth.
*   **Fórmula:** `(MRR Inicial + MRR Expansão - MRR Churn - MRR Downgrade) / (MRR Inicial) * 100`
*   **Meta:** > 115% (World-class B2B SaaS).
