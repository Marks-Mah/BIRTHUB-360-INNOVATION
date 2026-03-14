# Critérios de Qualidade para Novos Templates - BirthHub 360

## Objetivo
Estabelecer um alto padrão de exigência para publicar um novo Agente ("Pack") no catálogo do Marketplace, garantindo que o primeiro contato de um usuário não resulte em frustração por configurações falhas ou ineficientes.

## Padrão de Publicação: A Regra de 80/20
Um template só é aceito no catálogo (seja construído internamente ou pela comunidade) se ele resolver **80% do problema B2B padrão (RevOps) "Out of the box" (Direto da caixa).** O usuário deve apenas precisar configurar os 20% finais (Sua API de CRM, seu preço e sua base de conhecimento única).

## Critérios de Avaliação (Checklist do Curador)

Para um novo Pack (ex: "Especialista de SDR LATAM") entrar no Marketplace, o autor deve provar:

### 1. Robustez do Prompt de Sistema (Core Prompt)
- [ ] O prompt possui instruções explícitas de **Prevenção de Alucinação** (ex: "Se você não souber o preço na base de conhecimento (BKB), responda: 'Vou consultar um executivo e retorno' e NUNCA invente números").
- [ ] O prompt obriga o agente a usar as Ferramentas (Tools) integradas antes de gerar respostas definitivas (Padrão ReAct: Pensar, Agir, Observar).
- [ ] O prompt define formato de saída rígido quando consumido por outros sistemas (JSON ou Pydantic estrito).

### 2. Tratamento de Erros e Degradação
- [ ] O template descreve claramente no seu Manifesto (como em `manifest.yaml`) o que o agente fará se uma ferramenta falhar (ex: A API do HubSpot retornar 429 Rate Limit).
- [ ] Existe um "Modo Fallback" de segurança onde ele notifica um humano em vez de agir ou paralisar indefinidamente.

### 3. Descrição de Valor e Documentação do Marketplace
- [ ] O Pack tem um título voltado para o negócio, não técnico (Ex: "Auditor de Higiene de CRM" em vez de "Script Python de Limpeza de Dados Salesforce").
- [ ] A descrição informa exatamente **quais ferramentas (Tools)** o usuário deve ter instaladas (Ex: Requer Integração com Gmail, OpenAI API).
- [ ] Fornece um "Caso de Uso de Exemplo Real", um roteiro com "Expected Input" e "Expected Output".

### 4. Segurança
- [ ] O template não exige o envio de chaves de API cruas (Secret Management) no corpo do prompt. Todas as integrações são tratadas pelas credenciais centralizadas do BirthHub 360 Vault.
- [ ] O template não contém lógica que tente extrair PII desnecessárias (Privacidade by Design).
