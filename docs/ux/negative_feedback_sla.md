# SLA de Resposta a Feedback Negativo de IA - BirthHub 360

## Objetivo
Definir o prazo máximo de resposta, a ação mínima exigida internamente e a política de comunicação ao usuário quando este submeter um feedback explícito negativo (ex: Thumbs Down com comentário) sobre o trabalho de um Agente IA.

## A Importância do Feedback de IA
Diferente de um "bug de botão" que pode ir pro backlog, um feedback negativo sobre IA significa que a máquina falhou em sua principal função cognitiva (trabalho cognitivo delegado). Isso gera quebra imediata de confiança (Loss of Trust). A velocidade de resposta dita se o usuário desligará o agente ou nos dará uma segunda chance.

## SLA de Resolução

### 1. Triagem e Recebimento (T0)
- Todo feedback "Negativo com Comentário" gera um Ticket Prioritário automático no Zendesk na fila de "AI QA".

### 2. Tempo de Primeira Resposta (First Reply Time)
- **SLA Alvo:** < 4 horas úteis.
- **Comunicação ao Usuário:** Não usar auto-responder genérico. A resposta deve ser humana: *"Olá [Nome]. Vi que você avaliou mal o e-mail gerado para o cliente XPTO alegando 'Tom Agressivo'. Já pausei essa cadência para sua segurança e enviei o log para a engenharia analisar."*

### 3. Ação Mínima Interna (Root Cause Analysis)
- **Prazo:** < 24 horas úteis.
- **Ação:** O AI Product Manager deve rodar a rastreabilidade do LangSmith/Braintrust para aquele ID de execução.
- **Diagnóstico:** Classificar a falha em uma de três caixas:
  - *Falha de Prompt Base* (Nós erramos. Exige patch global).
  - *Falha de BKB/Contexto do Cliente* (Cliente não subiu o PDF de preços. CS deve educá-lo).
  - *Alucinação Pura do LLM* (Força maior. Reportar ao time de Engenharia de Confiabilidade).

### 4. Tempo de Resolução Final (Time to Resolution)
- **SLA Alvo:** < 72 horas úteis.
- **Comunicação Final (Fechando o Loop):**
  - *"Olá [Nome]. O problema de tom agressivo ocorreu porque a instrução X estava ambígua. Já aplicamos um hotfix (v1.2.1) no seu agente e rodamos testes de segurança. Você pode testá-lo novamente no Modo Simulação para aprovar a mudança?"*

## Métricas de Acompanhamento (Para a Liderança)
- **% de Feedbacks Fechados no SLA (<72h):** Meta de 95%.
- **Reincidência:** Se o mesmo usuário der um novo "Thumbs down" pelo mesmo motivo em menos de 15 dias, a conta entra em Risco Vermelho de Churn imediato.
