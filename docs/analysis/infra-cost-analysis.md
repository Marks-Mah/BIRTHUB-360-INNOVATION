# Análise de Custos de Infraestrutura e Preços dos Planos (Infra Cost Analysis)

Este documento justifica a estrutura de preços (Pricing Model) do BirthHub360 com base nos custos unitários estimados de infraestrutura (AWS, Bancos de Dados, e Modelos de IA). O objetivo é garantir que cada nível de assinatura (Free, Starter, Pro, Enterprise) mantenha uma Margem Bruta (Gross Margin) mínima saudável (ideal > 80% nos pagos) após cobrir os Custos dos Produtos Vendidos (COGS - Cost of Goods Sold).

A infraestrutura é o maior ofensor de margem em empresas de IA Generativa. A ausência desta validação teórica poderia levar a prejuízos (Negative Unit Economics).

## 1. Premissas de Custo Base (COGS Unitário - Estimativa)

Os custos abaixo são estimativas para provisionamento em Cloud (AWS) e APIs externas (OpenAI / Anthropic):

*   **Armazenamento (S3 Standard):** ~$0.023 por GB / mês.
*   **Banco de Dados (RDS PostgreSQL):** O custo não escala perfeitamente por tenant devido ao *Shared Schema*. Assumimos um custo amortizado de ~$0.05 por GB de dados transacionais / mês, mais o custo base de computação (Instâncias db.r6g) rateado entre os clientes.
*   **Transferência de Dados (Bandwidth Out):** ~$0.09 por GB.
*   **Computação Serverless / Fargate (Workers):** ~$0.0000166667 por GB-Segundo + Custos fixos do cluster. O custo por execução típica de Agente/Workflow de 5 segundos é mínimo (~$0.0001).
*   **Tokens LLM (GPT-4o mini, por exemplo):** ~$0.15 / 1M Input Tokens, ~$0.60 / 1M Output Tokens. Assumimos um custo médio pesado de inferência por Agente de ~$0.001 a $0.005 por execução complexa com Retrieval.

## 2. Análise por Plano de Assinatura

### 2.1. Plano Free (PLG - Aquisição de Clientes)
*   **Mensalidade:** $0
*   **Limites Ofertados:** 3 Membros, 1 GB S3, 50 Execuções de Agentes.
*   **Custo Estimado (COGS Máximo/Mês):**
    *   S3 (1GB): $0.023
    *   RDS Rateado + Bandwidth: ~$0.05
    *   Computação (50 execuções): ~$0.005
    *   LLM Tokens (50 execuções): ~$0.25 (50 * $0.005)
    *   **Custo Total Máximo (Teórico):** ~$0.33 / tenant / mês.
*   **Análise:** O plano Free age como custo de marketing (CAC). Como a grande maioria dos usuários "Free" não usa 100% dos limites (taxa de inatividade > 70%), o custo real amortizado é de cêntimos. No entanto, o bloqueio estrito em 50 execuções previne abusos de LLM (que poderiam disparar o custo para dezenas de dólares se ficasse sem rate limit ou quotas - DDoS financeiro).

### 2.2. Plano Starter
*   **Mensalidade Proposta (Exemplo):** $49 / mês
*   **Limites Ofertados:** 10 Membros, 50 GB S3, 1.000 Execuções de Agentes.
*   **Custo Estimado (COGS Máximo/Mês):**
    *   S3 (50GB): $1.15
    *   RDS Rateado + Bandwidth (10GB): ~$0.90
    *   Computação (1.000 execuções): ~$0.10
    *   LLM Tokens (1.000 execuções): ~$5.00
    *   **Custo Total Máximo (Teórico):** ~$7.15 / tenant / mês.
*   **Análise:** Margem Bruta de ~$41.85 (~85%). O plano é altamente lucrativo. O maior ofensor de margem é o consumo de LLM. Os limites protegem contra usuários "Heavy" que tentam processar milhares de documentos por $49.

### 2.3. Plano Pro
*   **Mensalidade Proposta (Exemplo):** $199 / mês
*   **Limites Ofertados:** 50 Membros, 500 GB S3, 10.000 Execuções de Agentes.
*   **Custo Estimado (COGS Máximo/Mês):**
    *   S3 (500GB): $11.50
    *   RDS Rateado + Bandwidth (50GB): ~$4.50
    *   Computação (10.000 execuções): ~$1.00
    *   LLM Tokens (10.000 execuções): ~$50.00
    *   **Custo Total Máximo (Teórico):** ~$67.00 / tenant / mês.
*   **Análise:** Margem Bruta de ~$132.00 (~66%). A margem reduz devido à volumetria intensiva de LLMs (se for modelo nativo e não BYOK - Bring Your Own Key). Se o cliente optar por BYOK, a margem de infraestrutura sobe consideravelmente para > 90%. Para manter a saúde financeira, o "Overage Billing" (Cobrança Excedente) deve ser rigorosamente aplicado após 10.000 execuções.

### 2.4. Overage Billing (Upsell e Preço Excedente)
Para clientes do plano Pro que atingirem o teto de execuções ou de assentos (Seats), a política financeira deve aplicar multiplicadores de markup para proteger a infraestrutura contra uso abusivo e gerar lucro marginal.

*   **Assento Extra (Seat Overage):** Custo de infra é quase zero (só banco de dados e tráfego leve). Cobrar ex: $15 / usuário adicional é 99% de margem pura.
*   **LLM/Agentes Extra (Execution Overage):** Cobrar ex: $10 por pacote de 1.000 execuções extras. O custo real é de ~$5.00 (LLM + Fargate). A margem se mantém em 50% nas excedentes, incentivando o upgrade orgânico para contratos Enterprise (onde margens maiores são negociadas em pacotes de volume).

## 3. Conclusão da Análise
A estrutura técnica e de negócios apresentada no *Member Limits Policy* e *Forced Upgrade Policy* sustenta financeiramente o BirthHub360. Os "Hard Limits" nas APIs e Orquestrador LangGraph garantem que o consumo de OpenIA/Anthropic, nosso maior COGS variável, nunca supere a receita fixa contratada pelo usuário, protegendo o SaaS contra insolvência no caso de picos de adoção massiva (Viral Growth).