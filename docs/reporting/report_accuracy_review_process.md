# Processo de Revisão e Confirmação de Acurácia de Relatórios

## 1. Propósito
Garantir que os relatórios gerados automaticamente pelo painel do BirthHub360 para clientes (Tenants) – incluindo métricas de uso de IA, consumo de tokens, horas salvas e ROI – sejam matematicamente precisos, defensáveis e isentos de falhas de cálculo ("Data Discrepancy").

## 2. A Auditoria de Precisão (Report Review)

Antes que o *engine* de relatórios seja marcado como "Estável/Prod", os dados apresentados (KPIs) precisam ser reconciliados com a fonte da verdade (Source of Truth). A equipe de Data Engineering/BI executa o seguinte protocolo de revisão a cada grande *release*:

### 2.1. Reconciliação Financeira (Billing vs. Telemetria)
*   **O Teste:** O valor total gasto no dashboard de "Custo da Plataforma" de um Tenant deve corresponder com precisão de centavos à fatura mensal enviada pelo Stripe.
*   **Cálculo:** `(Soma dos Tokens Input * Preço Input) + (Soma Tokens Output * Preço Output) + Assinatura Fixa == Stripe Invoice`.
*   **Tolerância:** Erros de arredondamento aceitáveis até 0.01% por conta de conversão de moeda. Discrepâncias maiores indicam que eventos de uso (*webhook drops*) não estão sendo faturados ou contados no painel.

### 2.2. Reconciliação Operacional (Horas Salvas)
*   **O Teste:** O cálculo de "Horas Salvas" muitas vezes soa exagerado ("Vaity Metric"). Devemos confirmar se a fórmula está correta.
*   **Cálculo:** Verificar se `Contagem de Execuções Defletidas` exclui corretamente as execuções que falharam (HTTP 500) ou que resultaram em intervenção humana (Handoff). Não podemos contabilizar economia de tempo em um processo que o agente não terminou.
*   **Confirmação:** A conta deve ser estritamente: `Total de Fluxos Concluídos (Status=SUCCESS) * Variável Configurável de Tempo Manual`.

### 2.3. Sanidade de Quality Score (Accuracy)
*   **O Teste:** A porcentagem de aceitação (Thumbs Up) no relatório do CEO não pode incluir os "votos em branco" (interações onde o usuário não avaliou).
*   **Cálculo:** O *Score* deve ser `Total Positivo / (Total Positivo + Total Negativo)`. Avaliações nulas são tratadas como métricas de engajamento em separado, não diluindo ou inflando artificialmente a qualidade.

## 3. Ações em Caso de Falha de Acurácia
Se um Cliente (Customer Success) reportar que os números do painel não batem com a realidade (ex: "O dashboard diz que processamos 1000 chamados, mas no Zendesk só temos 500"):
1.  **Ticket de P1 (Bug de Dados):** Dados mentirosos destroem a confiança.
2.  **Snapshot e Recálculo:** A equipe fará uma extração crua do PostgreSQL (Raw Logs) e rodará um script Python independente para re-somar os eventos. Se o script independente bater com o Zendesk e não com o dashboard, há um erro de caching ou falha de query no *frontend*.
3.  **Correção e Errata:** Após o *hotfix*, um aviso ("*Data Correction Notice*") deve ser exibido no painel do cliente indicando que os dados do mês "X" foram reprocessados para maior precisão.
