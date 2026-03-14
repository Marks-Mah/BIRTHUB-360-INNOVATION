# Critérios de Aceite do Dashboard (Teste de 30 Segundos) - BirthHub 360

## Objetivo
Estabelecer um critério de aprovação claro e rigoroso para a primeira tela que o usuário vê (Dashboard Home) após concluir o Onboarding. O design deve passar pelo "Teste dos 30 Segundos".

## O Teste dos 30 Segundos
Um novo usuário, sem treinamento prévio na plataforma e que acabou de conectar seu CRM ou fornecer dados iniciais, tem 30 segundos (cronometrados) para compreender visualmente o estado atual do seu negócio.

## Critérios Obrigatórios (Critérios de Aceite para UX/Frontend)

Para uma versão do Dashboard Home ir para Produção, deve atender aos 4 critérios abaixo (validado por 3 usuários beta distintos):

### 1. Percepção Imediata de Status (Aonde Focar?)
- Em menos de 5 segundos, o usuário sabe responder se o cenário geral é "Bom" ou "Ruim" sem precisar fazer matemática mental.
- O uso de cores de semáforo (Verde, Amarelo, Vermelho) e setas de tendência (`▲ 5%` ou `▼ 2%`) deve guiar os olhos imediatamente para o pior e o melhor indicador da semana (ex: Churn Rate Vermelho, Novos Deals Verdes).

### 2. Ação Requerida (Próximo Passo Lógico)
- Em menos de 10 segundos adicionais, o usuário identifica pelo menos um problema acionável ou tarefa recomendada por um agente.
- O Dashboard deve conter um "Card de Prioridade" ou "Alerta da IA" destacado. Exemplo: *"SDR Bot: 15 e-mails frios classificados como 'Interesse' precisam da sua revisão."*
- Deve existir um botão claro (`Primary CTA Button`) ao lado deste alerta, como `Revisar E-mails`.

### 3. Entendimento do Valor da IA (Métrica de ROI)
- O usuário deve conseguir identificar rapidamente o card de Horas Economizadas ou Receita Recuperada (conforme métricas definidas em `roi_hours_saved.md` e `roi_value_perception.md`).
- A métrica de valor da IA não pode estar oculta em abas secundárias. Fica no cabeçalho ou nas "KPI Cards" superiores.

### 4. Ausência de Complexidade Abstrata
- Em 30 segundos, o usuário não deve ficar confuso com Vanity Metrics (conforme `vanity_metrics_analysis.md`) ou com explicações excessivas de como o LLM operou nos bastidores. O foco deve ser puramente no negócio (Receita, Horas, Reuniões).
- Gráficos não devem ter mais do que 3 séries (linhas/barras), para não necessitarem de interpretação avançada na primeira tela.

## Plano de Execução da Validação
- Para cada PR no Frontend que altere layouts das KPIs (Módulos do Dashboard), rodar um teste em vídeo rápido de 30s. "Onde seus olhos foram? O que você clicaria primeiro?"
