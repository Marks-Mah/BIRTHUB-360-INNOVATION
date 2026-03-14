# SLA de Resposta a Feedback Negativo

## Objetivo
Garantir que a insatisfação com a qualidade das respostas da IA seja tratada com urgência pela nossa equipe de Suporte (CS), evitando o Churn.

## Definição de Feedback Negativo Crítico
- Um ticket aberto pelo Gestor no painel classificado como: "A IA está mentindo/alucinando" ou "A IA xingou meu cliente".

## SLA Acordado

1. **Prazo de Primeira Resposta:** **< 2 Horas Úteis**.
   - A resposta deve ser humana (não um macro genérico).

2. **Ação Mínima Obrigatória:**
   - O CS deve localizar o `chat_id` mencionado na reclamação.
   - O CS deve identificar o motivo exato da alucinação (Ex: "O PDF que você subiu na página 4 tem um erro de digitação de preço").

3. **Comunicação ao Usuário (Template de Resposta):**
   - "Olá [Nome]. Analisamos a conversa. O Agente se comportou assim porque a regra X no 'Comportamento da IA' entrou em conflito com a Base de Conhecimento Y. Para corrigir isso imediatamente e evitar que aconteça de novo, sugira que você altere o texto para Z."

4. **Escalonamento:**
   - Se o CS identificar que o erro não foi culpa do setup do cliente, mas sim uma falha de sistema (Ex: Injeção de Prompt via quebra de guardrail do nosso sistema core), escalar IMEDIATAMENTE como P0 para a Engenharia.
