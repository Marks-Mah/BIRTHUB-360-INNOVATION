# Critérios de Aceite de Relatório: Acurácia, Clareza e Acionabilidade

## 1. Escopo e Validação Contínua (Report Acceptance Criteria)

Todo novo Dashboard, Métrica (KPI) ou Exportação (PDF/CSV) desenvolvido pela equipe de Engenharia/BI do BirthHub360 deve passar por um rigoroso processo de homologação antes de ser disponibilizado no painel dos clientes (Tenants).
Relatórios errados ou confusos geram perda imediata de credibilidade e aumentam a carga de suporte (Customer Success).

O objetivo deste documento é estabelecer os **3 Pilares Obrigatórios** que um relatório deve cumprir para ser aceito na pipeline de CI/CD (QA Sign-off).

---

## Pilar 1: Acurácia (Accuracy & Data Integrity)

O dado deve ser inquestionável e reconciliável com a fonte da verdade (Banco de Dados / Stripe).

*   **[1.1] Reconciliação Matemática Zero-Delta:** Se o relatório apresenta "Gasto Total de Tokens = R$ 5.000,00", a soma exata de todos os eventos granulares de uso no backend (Raw Logs) faturáveis naquele período deve ser exatamente R$ 5.000,00 (considerando regras de arredondamento pré-definidas). Não são aceitos deltas maiores que 0.01%.
*   **[1.2] Filtragem Temporal (Timezones):** O relatório respeita rigorosamente os limites de data e fuso horário (UTC vs. Local do Tenant)? Um evento ocorrido às 23:59 de 31/Jan (BRT) não pode aparecer no relatório de Fevereiro.
*   **[1.3] Isolamento de Tenant (Row-Level Security):** O teste automatizado provou que é impossível (via manipulação de URL ou API) que o Tenant A acesse dados, métricas ou logs consolidados do Tenant B no relatório?
*   **[1.4] Exclusão de Anomalias Reais:** O relatório filtra corretamente execuções de teste interno (ex: simulações de sandbox), execuções que falharam antes de consumir tokens (HTTP 500 imediato) e não as contabiliza como "Sucesso" ou "Valor Gerado"?

---

## Pilar 2: Clareza (Clarity & Usability)

Um relatório preciso, mas ininteligível, não tem valor executivo. A carga cognitiva para entender a métrica deve ser próxima a zero.

*   **[2.1] Títulos e Rótulos Autoexplicativos:** Evitar jargões internos do BirthHub360 que o cliente não entende. Em vez de `Total_Inferences_Completed_LLM`, usar `Total de Resoluções Autônomas`.
*   **[2.2] Contexto de Comparabilidade (Baselines):** Um número isolado (ex: "45.000 tokens") é inútil. O relatório fornece contexto visual? (ex: Setas indicando aumento/queda em relação ao período anterior? Barras de progresso em relação a um limite do plano?).
*   **[2.3] Tooltips de Metodologia:** Toda métrica complexa (ex: *Taxa de Deflexão* ou *Quality Score*) possui um ícone de interrogação `[?]` acessível que explica, em até 2 frases, a fórmula exata usada para calcular aquele número? O usuário nunca deve precisar adivinhar o que a métrica significa.
*   **[2.4] Visualização Adequada:** O tipo de gráfico escolhido conta a história correta? (Ex: Linhas temporais para tendências, Barras empilhadas para composição de custos por departamento, não usar gráficos de pizza para mais de 5 categorias).

---

## Pilar 3: Acionabilidade (Actionability & Next Steps)

O relatório deve provocar uma decisão de negócio ou mudança de comportamento, não apenas ser um "recibo" de uso passivo.

*   **[3.1] Identificação de Gargalos (Top/Bottom Performers):** O relatório destaca os extremos? (Ex: "Qual foi o Agente que mais gerou erro este mês?" ou "Qual departamento está pagando mais licenças do que usando?").
*   **[3.2] Correlação de Custo e Valor:** Se o relatório mostra um pico de custo financeiro no dia 15, ele permite um *drill-down* (clique profundo) para o administrador investigar o que causou aquele pico (Qual usuário? Qual prompt exato rodou em loop infinito e queimou o orçamento?).
*   **[3.3] Recomendações Automáticas (Insights):** O sistema consegue gerar pelo menos um alerta útil baseado na telemetria? (Ex: "*Aviso: O seu 'Agente de Análise Jurídica' está falhando em 20% das vezes por 'Timeout na API Externa'. Recomendamos revisar a conexão da ferramenta para não desperdiçar o limite mensal de execuções.*")
*   **[3.4] Exportação Transparente:** Os dados agregados e brutos que compõem o dashboard podem ser facilmente exportados (CSV/PDF) com apenas um clique para que o analista do cliente possa cruzar no Excel/PowerBI interno da empresa dele (sujeito às políticas de segurança e watermark)?

## Assinatura de Aceite (Go/No-Go)
Se o relatório (ou nova feature do dashboard) falhar em **qualquer um** dos critérios acima durante a homologação (UAT), a funcionalidade volta para a esteira de desenvolvimento. Não publicamos relatórios "mais ou menos certos".
