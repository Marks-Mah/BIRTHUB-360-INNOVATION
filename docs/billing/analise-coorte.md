# Análise de Coorte e Retenção (Cohort Analysis)

A Análise de Coorte é a principal ferramenta do BirthHub360 para descobrir se o produto está ficando melhor ou pior ao reter clientes ao longo do tempo. Em vez de olhar para o "Churn Rate" global, agrupamos clientes pelo mês em que assinaram.

## 1. O Que é uma Coorte (Cohort)?
Uma coorte é um grupo de clientes que compartilham uma característica comum, geralmente o mês em que realizaram a assinatura paga inicial.
- **Exemplo:** "Coorte de Janeiro/2024" são os 50 novos clientes que pagaram a primeira fatura em Jan/2024.

## 2. Como Interpretar a Matriz de Retenção
A matriz de coorte típica possui as Coortes (Meses) no eixo Y e a Idade do Cliente (Meses 1, 2, 3...) no eixo X. O valor nas células é a % de clientes que continuam pagando.

| Coorte | Mês 0 (Início) | Mês 1 | Mês 2 | Mês 3 | Mês 6 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Jan/2024** | 100% (50 users) | 80% | 75% | 70% | 60% |
| **Fev/2024** | 100% (60 users) | 85% | 80% | 78% | - |
| **Mar/2024** | 100% (80 users) | 92% | 88% | - | - |

**Interpretação B2B:**
1. **O Churn Inicial (Drop-off do Mês 1):** Geralmente é o mais alto. Clientes que assinam e cancelam logo após 30 dias geralmente indicam falha no processo de *Onboarding* ou arrependimento na promessa de valor do marketing. No exemplo acima, a coorte de Março (92%) teve um onboarding muito superior à de Janeiro (80%).
2. **Estabilização da Curva (Achatamento):** Se a retenção de uma coorte cai para 50% no Mês 3 e continua caindo até 10% no Mês 12, o produto não tem "Product-Market Fit" sustentável (alta rotatividade). Se a curva "achata" e estabiliza em 60% após o Mês 3, significa que aqueles que ficam encontram valor recorrente nos Agentes de IA.

## 3. Coorte de Receita (Net Revenue Retention por Coorte)
A contagem de usuários pode esconder o valor monetário. Uma coorte pode perder 20% dos clientes (Logos), mas os 80% que ficaram fizeram *upgrades* tão grandes que a receita gerada por aquela coorte *aumentou*.

- **Smile Graph (Gráfico Sorriso):** O objetivo supremo do SaaS B2B com faturamento híbrido (*Usage-based* e *Seats*). O faturamento de uma coorte começa em 100%, cai para 95% no Mês 1 (devido aos primeiros cancelamentos), mas depois sobe gradualmente para 110%, 120%, 150% nos meses seguintes devido à expansão da adoção dos Agentes dentro da empresa.

## 4. Ações Derivadas da Análise
1. **Se a Coorte Mais Recente Performa Pior que as Antigas:** O processo de Vendas está trazendo leads desqualificados (Bad Fit), ou uma nova feature lançada tem bugs críticos no onboarding. Pausar aquisição e consertar o fluxo inicial.
2. **Se o Churn ocorre repentinamente no Mês 12:** É provável que clientes com plano anual não estejam vendo motivos para renovar o contrato. É necessário engajamento de CSM (Customer Success) proativo no Mês 10, demonstrando o ROI gerado no ano para justificar a renovação.