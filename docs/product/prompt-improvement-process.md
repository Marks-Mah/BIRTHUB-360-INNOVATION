# Processo de Melhoria Contínua de Prompts

## Objetivo
Estabelecer um ciclo de feedback onde as interações reais (e suas avaliações) alimentam a melhoria dos System Prompts base dos nossos Templates de Agentes, garantindo que o "motor" do BirthHub 360 fique cada vez mais inteligente.

## Ciclo de Feedback (Feedback Loop)
1. **Coleta:** O usuário final (Lead) clica no widget "👍 Gostei" ou "👎 Não Gostei" (NPS do chat) ao final da conversa.
2. **Agregação:** Todas as conversas de Templates Públicos (ex: SDR Imobiliário) com nota 👎 são agrupadas quinzenalmente.
3. **Análise de Causa Raiz:** O "Prompt Engineer" (Responsável) analisa as transcrições para encontrar padrões de falha.
   - *Exemplo:* A IA está oferecendo descontos que não existem.
4. **Iteração (Refinamento):** O Prompt Base do Template é alterado para incluir o guardrail explícito: `"NUNCA ofereça descontos. Se perguntado sobre preço, redirecione para o time comercial."`
5. **Deploy e Monitoramento:** O Template é atualizado silenciosamente (Versão 1.1). A métrica de NPS da próxima quinzena é monitorada para validar a melhoria.

## Responsável
- **Prompt Engineer / PM de IA:** Dono do catálogo de templates e da qualidade das respostas.

## Métricas de Sucesso
- Aumento do **Average Agent NPS** global ao longo do trimestre.
- Redução na taxa de "Human Handoff" imediato após a 1ª mensagem.
