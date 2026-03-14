# Política de Dados no Dashboard - BirthHub 360

## Objetivo
Definir a política de exibição de dados nos dashboards da plataforma, estabelecendo diretrizes claras sobre granularidade, frequência de atualização e privacidade (em conformidade com a LGPD/GDPR).

## 1. Granularidade dos Dados

### Níveis de Visão
- **C-Level / Diretoria:** Visão agregada por quarter/mês. Receita total, ticket médio, CAC, LTV, saúde geral do pipeline. Sem identificação individual de leads a menos que drill-down seja acionado em contas estratégicas (Enterprise).
- **Gestão (Managers):** Visão por semana/mês filtrada por equipe (ex: Squad de SDRs). Métricas de volume (emails enviados, calls feitas, MQLs convertidos) e taxas de conversão por etapa do funil.
- **Operacional (SDR/AE):** Visão diária/semanal individual. Lista nominal de leads prioritários, "Next Best Action" (NBA) recomendada pelo Agente IA para cada conta específica.

## 2. Frequência de Atualização (Data Freshness)

O equilíbrio entre "tempo real" e "custo de infraestrutura" dita as seguintes políticas:

- **Near Real-Time (Delay de até 5 minutos):** Alertas de "risco de churn" iminente gerados por IA, notificações de fechamento de contrato ("Won"), e respostas de leads quentes (Inbound).
- **Batch de Curto Prazo (A cada 1 hora):** Atualização do status do funil de vendas, contagem de e-mails enviados pelos agentes em background.
- **Batch Diário (D+1, de madrugada):** Recálculo complexo de modelos preditivos, score de saúde global da base de clientes (Health Score), e métricas de longo prazo (LTV/CAC).

## 3. Privacidade e Conformidade (LGPD/GDPR) no Dashboard

### Anonimização Visual (Masking)
- Informações Pessoalmente Identificáveis (PII) sensíveis como telefone pessoal, CPF/RG (se aplicável), e endereços residenciais são mascaradas por padrão em visões de relatório gerencial (ex: `+55 (11) 9****-1234`).
- Apenas a equipe operacional (SDRs, Closers) que detém a "posse" legal daquele lead (via atribuição do CRM) pode visualizar o dado desmascarado, visando minimizar a superfície de vazamento em screenshots de gestão.

### Consentimento em Análises Agregadas
- A plataforma assegura que análises comportamentais amplas (ex: "Qual template converte melhor?") utilizam dados anonimizados em massa. Nomes e e-mails de clientes finais nunca são exibidos em relatórios de performance de templates compartilhados entre tenants na marketplace.

### Limpeza e Direito ao Esquecimento
- Quando um lead solicita a remoção de seus dados, essa exclusão reflete no pipeline, mas para manter a integridade histórica dos relatórios de receita, o registro do lead se torna um "Lead Anonimizado" (mantendo dados de volume e valor monetário para estatística de conversão).
