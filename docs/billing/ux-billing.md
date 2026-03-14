# Avaliação de UX de Billing e Autoatendimento

Para escalar (SaaS Scalability), o BirthHub360 não pode depender de um humano respondendo tickets como *"O que é essa cobrança na minha fatura?"*. A UX da página de Faturamento (Billing Settings) deve ser concebida como um produto de "Autoatendimento" (Self-Service) 100% autônomo e transparente.

## 1. Problemas de UX em SaaS Baseado em Uso (Overage)
O modelo híbrido apresenta complexidade mental para o usuário:
- **"O que eu estou pagando?"** O usuário não entende que uma "Interaction" engloba leitura de banco, OCR e token de LLM.
- **"Por que veio $356 em vez de $149?"** O susto ao receber a fatura gera atrito B2B (necessidade de justificar para os diretores).
- **Escondendo o botão de cancelar:** Dificultar o downgrade ou cancelamento via Dark Patterns aumenta o chargeback e a frustração.

## 2. Princípios de Design de Billing (Clareza e Previsibilidade)

### A. O Breakdown da Fatura (Itemization)
A tela de fatura mensal não pode ter apenas uma linha "Uso do BirthHub360: $356". Ela deve mostrar o *Receipt Breakdown* detalhado:
1. Plano Base (Growth): **$149** (Inclui 2.500 interações e 10 seats).
2. Assentos Extras: 2x $15 = **$30**.
3. Uso Excedente de IA (Overage): 1.770 interações x $0.10 = **$177**.
4. Impostos (Tax/VAT): **$0**.
- **Drill-down de Uso:** Um botão "Ver detalhes do Overage" deve abrir um modal mostrando qual Agente gastou aquelas interações (ex: *Agente SDR consumiu 80% do uso excedente analisando planilhas de prospecção do dia 12 ao 14*). O uso é traduzido em *valor de negócio*, não em jargão de dev (como "tokens prompt e completion").

### B. Gestão de Plano Transparente
- **Comparativo Lado-a-Lado:** Na tela de `/billing/upgrade`, mostrar o uso atual na coluna do plano atual versus o que seria no plano superior. ("Se você for para o Scale, pagará $399 de base, mas seus custos de overage cairão a zero neste ritmo. Você economizará $50 no final do mês!").
- **Downgrade Self-Service:** O botão de cancelar ou reduzir o plano deve estar na mesma tela, sem exigir agendamento de call com "Account Manager" (livre atrito), alertando apenas os limites técnicos perdidos (Impacto de Downgrade).

### C. Download de NFe e Recibos
Um bloco dedicado a "Histórico de Faturas" com ícones explícitos para download de PDF da *Invoice* e PDF da Nota Fiscal (NFe) para as contabilidades brasileiras. A contabilidade não tem acesso ao BirthHub360; portanto, a página deve permitir "Envio automático mensal para o email contabilidade@empresa.com".

### D. Alertas Preditivos (No-Surprise Policy)
A UX não se restringe à página. O banner preditivo definido no Modelo de Projeção (ADR-025 / Projeções) deve aparecer globalmente no topo da aplicação sempre que o usuário (apenas os de cargo `Admin`) fizer login e a projeção estiver 50% maior que sua fatura média histórica.