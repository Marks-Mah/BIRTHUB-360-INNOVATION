# Processo de Melhoria Contínua de Prompts - BirthHub 360

## Objetivo
Estruturar o processo (Feedback Loop) onde a avaliação negativa ou positiva de usuários ("Thumbs up/down" nos outputs dos agentes) é ingerida, analisada e transformada em atualizações reais (Patch/Minor versions) nos prompts do sistema (LangGraph/LLM).

## A Engrenagem do Feedback

### 1. Coleta e Categorização (In-App)
Quando um usuário rejeita a saída de um Agente (Ex: "Não gostei deste e-mail gerado pelo SDR"), um modal rápido aparece pedindo o motivo:
- [ ] Tom inadequado (Muito agressivo/informal).
- [ ] Faltou contexto (A IA ignorou dados da BKB).
- [ ] Alucinação (A IA inventou nomes/preços).
- [ ] Falha técnica (Output em JSON quebrado).

### 2. Triagem Semanal (The AI QA Sync)
**Frequência:** Toda terça-feira.
**Responsável:** AI Product Manager + Prompt Engineer.
**Ação:** Analisam o relatório de "Dislikes". Se uma categoria ou Agente específico tiver um "Spike" (aumento de 20% em rejeições), ele entra na sprint de correção.

### 3. O Teste de Regressão de Prompts (Prompt Evaluation)
O Prompt Engineer não apenas "muda as palavras". Ele utiliza a ferramenta (ex: LangSmith / Braintrust) para rodar o novo prompt contra um dataset de 100 interações passadas ("Golden Dataset").
**Critério de Sucesso:** O novo prompt deve corrigir a queixa principal (ex: Tom agressivo) **sem** piorar as taxas de sucesso nas outras dimensões (ex: Sem voltar a alucinar).

### 4. Deploy e Comunicação (Patch Release)
- Se a mudança for no "Prompt de Sistema Padrão" de um template da comunidade, a versão do Pack no Marketplace sobe (Ex: de `v1.2.0` para `v1.2.1`).
- **Fechando o Loop (Comunicação ao Usuário):** Se o usuário deixou um comentário escrito junto com o "Thumbs Down", o CS envia um e-mail: *"Oi João, você reportou que o Agente estava errando o nome dos seus produtos. Nossos engenheiros atualizaram o modelo hoje. Tente rodar novamente!"*
