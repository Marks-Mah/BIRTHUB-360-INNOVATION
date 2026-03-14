# Guia de Apresentação de Relatório (CS Guide - Customer Success)

## 1. Objetivo e Audiência
Este guia é voltado para os Gerentes de Sucesso do Cliente (Customer Success Managers - CSMs) do BirthHub360 que precisam conduzir as reuniões mensais ou trimestrais de acompanhamento (EBRs/QBRs - Executive Business Reviews) com os patrocinadores executivos dos Tenants (CEOs, CFOs, CIOs, ou Líderes de Inovação).
O objetivo não é ler números ("gastamos X, economizamos Y"), mas sim *contar a história* do amadurecimento e escalonamento da Inteligência Artificial dentro da empresa do cliente, provando o Retorno sobre Investimento (ROI) e identificando oportunidades de up-sell/cross-sell (novos casos de uso).

## 2. Preparação Pré-Reunião (O DEVE FAZER do CSM)

1.  **Geração do Relatório Base:** Exporte o template padronizado (ver `executive_report_template.md`) cobrindo os últimos 30, 60 ou 90 dias da operação do cliente. Verifique se há discrepâncias gritantes de faturamento (ver `report_accuracy_review_process.md`).
2.  **Identificação de Tendências:** Analise os KPIs de adoção e os SLAs de revisão de novos agentes.
    *   O cliente está aumentando o uso constante? (Sinal verde)
    *   Um agente de TI que antes rodava 1.000 chamados/dia caiu para 100? (Sinal vermelho - por quê? Integração quebrou? A equipe voltou a fazer manualmente?)
3.  **Seleção do "Highlight do Mês" (A História):** Identifique um evento em que um fluxo complexo funcionou perfeitamente ou que gerou economia mensurável. (Ex: "O agente legal do cliente leu 5.000 contratos da Black Friday num final de semana. Focar nisso").
4.  **Seleção de "Pontos Críticos" (Os Alertas):** Quais agentes têm alta taxa de erro, *timeouts*, ou baixa aceitação humana (CSAT ruim)?
5.  **A Visão Geral da Governança:** O Tenant está tentando instalar pacotes inseguros não-assinados? Eles estão quebrando políticas da empresa? (Importante alertar o CISO deles se você perceber muitos `Sandbox Violations`).

## 3. O Roteiro da Reunião (Agenda Padrão - 45 Minutos)

A estrutura sugerida para a apresentação é baseada no modelo "O que aconteceu, O que significa, O que faremos a seguir".

### 3.1. Abertura e Alinhamento de Expectativas (5 min)
*   **Ação:** Recapitule brevemente o principal objetivo de negócio que o cliente tinha ao assinar o BirthHub360 (ex: "Diminuir o tempo de *onboarding* de clientes", "Cortar custos de suporte de nível 1").
*   **Fala:** *"Estamos aqui hoje para avaliar se a IA está cumprindo a promessa de redução de horas operacionais na equipe de Atendimento, conforme combinamos."*

### 3.2. A Apresentação de Impacto (ROI e Produtividade) (15 min)
*   Mostre o **Custo Total da Plataforma (Faturamento Misto)** versus a **Economia de Horas Monetizada** (ver `executive_kpis.md`).
*   **Foco:** Traduza tokens em "trabalho feito".
    *   *"Este mês, o consumo das APIs da OpenAI e da AWS gerou R$ 4.500 de custo variável na plataforma. No entanto, traduzindo isso para a produção, nossos 5 Agentes de Triagem de Vendas processaram 12.000 e-mails. Estimamos que sua equipe teria gasto 600 horas (R$ 30.000) para ler, classificar e responder o mesmo volume. O ROI direto da operação em 30 dias foi de 566%."*
*   **A Métrica de Qualidade (Deflexão):** *"Dessas 12.000 interações, 4.000 foram resolvidas sem precisar de humano (33% de Automação Total). O restante gerou minutas (rascunhos) perfeitos para os SDRs aprovarem."*

### 3.3. Análise de Governança e Adoção (Risco e Engajamento) (10 min)
*   **Mudança de Cultura:** Mostre o gráfico de MAU (Usuários Únicos Ativos).
    *   *"Dos seus 50 funcionários no Jurídico, apenas 15 estão usando o Agente de Pareceres diariamente. Estamos deixando eficiência na mesa."* (Ofereça um workshop gratuito de *prompting* para ajudar na gestão da mudança).
*   **Segurança (Para o CISO do cliente):** Demonstre que o controle está ativo.
    *   *"O nosso sistema de DAST (análise dinâmica) bloqueou 3 tentativas do time de marketing de instalar extensões não-homologadas no ambiente na última semana. Seus dados estão protegidos."*

### 3.4. O Próximo Passo e Oportunidades (10 min)
O CS deve direcionar o cliente para expandir a esteira de valor (Upsell/Cross-sell orgânico).
1.  **Correção de Rota:** *"O agente de finanças tem 15% de erro de conexão com o SAP. Preciso de 1 hora com sua equipe de TI para resolver as credenciais."*
2.  **Novo Caso de Uso:** *"Notamos que vocês têm um volume alto de chamados de RH (Férias, Benefícios). Temos um Pack no Marketplace já homologado para isso. Vamos testar num grupo isolado mês que vem?"*
3.  **Upgrade de Plano:** Se o cliente está no plano `Pro` e sofrendo com os limites de segurança (sideloads não-assinados frequentes), posicione o plano `Enterprise` com BYOK e RLS dedicado.

## 4. O que o CS Nunca Deve Dizer ou Prometer
*   **Garantir a Precisão (Alucinação Zero):** Nunca prometa que "O agente é infalível" ou que "A IA de vocês não vai mais errar nos laudos depois desse *fine-tuning*". IA é probabilística. Prometa sempre "Aumentar a Resiliência e Refinar os Guardrails".
*   **Culpar o Cliente pela Conta Alta de Tokens:** Em vez de "Sua equipe está desperdiçando Tokens escrevendo textos inúteis", diga "Notamos que o *prompt* da equipe pode ser otimizado para não forçar o LLM a reler as mesmas 100 páginas de manual em toda resposta, reduzindo o custo da operação".
*   **Ignorar Vazamentos de Dados:** Se houver um alerta de que o sistema DLP do BirthHub360 flagrou credenciais sendo enviadas pelo cliente num *prompt*, trate com máxima seriedade (ver `data_breach_response_process.md`), avisando o administrador imediatamente em ambiente seguro, não casualmente.
