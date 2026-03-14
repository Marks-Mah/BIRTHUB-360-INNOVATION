# Análise de Percepção de Valor (Value Metrics)

A precificação e as páginas de upgrade do BirthHub360 precisam estar alinhadas com as "Value Metrics" (métricas de valor) percebidas pelos clientes. Se cobrarmos por métricas erradas, a percepção de custo será alta. Esta análise contrasta o que o sistema tecnicamente consome mais com o que o decisor B2B valoriza mais.

## 1. Mapeamento: Uso Técnico vs. Valor Percebido

| Feature / Funcionalidade | Intensidade de Uso (Custos Servidor) | Percepção de Valor pelo Cliente (Willingness to Pay) | Alinhamento para Upgrades |
| :--- | :--- | :--- | :--- |
| **Integração CRM & Sincronização** | Altíssima (Muitas requisições API diárias, polling) | Baixa-Média (Considerado "Obrigatório / Commodity". "O sistema deve sincronizar por padrão") | Inadequado cobrar *por sincronização*. Fica nos planos base. |
| **Agente SDR (Drafts de Email)** | Alta (Consome muitos tokens LLM de geração) | Alta (Substitui horas de trabalho de um humano). "Quantas reuniões ele marcou?" | Excelente para *Overage*. Cobra-se pelo output (Interações do Agente SDR). |
| **Agente Analista (Relatórios Preditivos)** | Média (Roda batch analytics pesado no VectorDB, mas poucas vezes por semana) | Altíssima (Diretoria olha isso e decide rumos estratégicos). "Insights premium" | Funciona como uma *Feature Flag* "Paywall" (Acesso exclusivo no plano Scale). |
| **Membros da Equipe (Seats)** | Baixíssima (Acesso a interface web gera custo quase zero de infraestrutura) | Média-Alta (Empresas grandes querem controle sobre quem vê o quê) | Aumenta o ARR base de forma previsível (Upsell por Volume de Equipe). |

## 2. A Ilusão da "Feature Mais Usada"
Muitos sistemas SaaS cometem o erro de basear o *paywall* na feature mais clicada. No BirthHub360, a aba "Pipeline de Vendas" (Visualização Kanban) pode ser a mais acessada da plataforma. Contudo, *Willingness to Pay* por um Kanban básico é zero (é commodity).
O Upgrade deve sempre ser impulsionado pelas features **"Game-Changers"** (Agentes especializados, Automação complexa, Relatórios customizados), independentemente se o usuário clica nelas 100 vezes ou 2 vezes ao mês.

## 3. Embalagem (Packaging) na Tela de Preços
Na UI de Billing, os planos devem vender os "Resultados" (Value Perceptions), não a infraestrutura:
- **Ruim:** "Acesso à API ChatGPT-4o", "Vetores de similaridade ilimitados", "Polling no Salesforce 5min".
- **Bom:** "Agentes autônomos que marcam reuniões para você", "Previsão de churn inteligente", "Sincronização em tempo real".

A métrica `AgentInteraction` (Overage metric do ADR-025) será descrita na interface como: *"1 Interação = Um agente executando uma tarefa complexa (ex: ler o histórico do Lead e escrever o e-mail perfeito)"*. Isso tangibiliza o custo de $0.10 e o torna justificável comparado a um funcionário.