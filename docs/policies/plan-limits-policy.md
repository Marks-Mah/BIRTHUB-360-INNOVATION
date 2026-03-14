# Limites por Plano (Plan Limits Policy) e Justificativas de Negócio

Esta política define os limites fixos de infraestrutura e funcionalidades impostos a cada Organização (Tenant) no BirthHub360, com base no plano de assinatura. Os limites existem para proteger a margem bruta (Gross Margin) do SaaS e prevenir o fenômeno de "Noisy Neighbor" (Vizinho Barulhento).

## 1. Níveis de Assinatura (Tiers)

### 1.1. Plano Free
Destinado à experimentação e descoberta de valor (Product-Led Growth).
*   **Membros Máximos:** 3
*   **Armazenamento (S3):** 1 GB
*   **Retenção de Dados / Histórico:** 30 dias (Passado esse prazo, os dados antigos ficam inacessíveis).
*   **Limites de API (Rate Limit):** 60 requisições / minuto.
*   **Execuções de Workflows/Mês:** 50
*   **Justificativa de Negócio:** O custo operacional desse plano deve ser coberto pelo CAC (Custo de Aquisição de Cliente) do marketing. Limitar o armazenamento e o histórico força clientes que encontram valor a migrarem para planos pagos, enquanto evita que bots hospedem grandes arquivos de graça.

### 1.2. Plano Starter
Destinado a pequenos negócios operacionais.
*   **Membros Base:** 10 (Adicionais cobrados à parte via add-ons).
*   **Armazenamento (S3):** 50 GB
*   **Retenção de Dados / Histórico:** 1 ano (365 dias).
*   **Limites de API (Rate Limit):** 300 requisições / minuto.
*   **Execuções de Workflows/Mês:** 1.000
*   **Justificativa de Negócio:** Suporta o uso diário normal de uma clínica ou escritório sem que o uso de banda/S3 ultrapasse o break-even point do valor mensal da assinatura.

### 1.3. Plano Pro
Destinado a negócios consolidados e integrações via API.
*   **Membros Base:** 50 (Assentos extras dinâmicos no faturamento).
*   **Armazenamento (S3):** 500 GB
*   **Retenção de Dados / Histórico:** Ilimitado (Enquanto durar a assinatura).
*   **Limites de API (Rate Limit):** 1.000 requisições / minuto.
*   **Execuções de Workflows/Mês:** 10.000
*   **Justificativa de Negócio:** O alto limite de API permite que esses clientes conectem CRMs e ERPs externos ao BirthHub360. A retenção ilimitada justifica o ticket médio elevado (Lock-in de Dados).

### 1.4. Plano Enterprise
Contratos anuais B2B, grandes hospitais ou redes.
*   **Membros Base:** Customizado no contrato (Ilimitado sujeito a Fair Use).
*   **Armazenamento (S3):** > 1 TB (Negociado).
*   **Retenção de Dados / Histórico:** Ilimitado + Exportações anuais.
*   **Limites de API (Rate Limit):** > 5.000 requisições / minuto (Infra dedicada opcional).
*   **Execuções de Workflows/Mês:** Customizado.
*   **Justificativa de Negócio:** Margem de lucro muito alta; os limites de quota são flexíveis e definidos contratualmente com aprovação do CTO/CFO.

## 2. Bloqueios Técnicos (Enforcement)
O middleware da API deve consultar ativamente o objeto `subscription` atrelado ao `tenant_id` e carregar os limites (Quotas) em memória/Redis.
*   Operações como Upload de Arquivo falham (HTTP 413 Payload Too Large ou 403) se o total de bytes do Tenant ultrapassar a cota de Storage.
*   Tentativas de criar novos membros ou executar o workflow "51" no plano Free retornam 402 Payment Required.