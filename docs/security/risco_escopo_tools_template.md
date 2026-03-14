# Análise de Risco: Escopo Excessivo de Tools em Skill Templates

Este documento examina os perigos arquiteturais e operacionais de se equipar um Agent Pack (ou um Skill Template isolado) com um número excessivo de ferramentas (tools), consolidando as melhores práticas do Princípio do Privilégio Mínimo (Least Privilege) aplicadas a IA.

## Definição do Risco (The "God Agent" Anti-Pattern)

Ocorre quando um agente (ex: `AEAgent`) recebe acesso indiscriminado a ferramentas de múltiplas funções (buscar CRM, deletar contatos, aprovar propostas, enviar emails em massa, consultar o ERP), mesmo que sua tarefa primária seja apenas qualificar uma ligação de Discovery.

## Principais Impactos Negativos

### 1. Risco de Segurança e Compliance (Exfiltração/Deleção)
*   **Prompt Injection:** Um agente com excesso de ferramentas torna-se um alvo de alto valor. Se um atacante (ex: cliente mal-intencionado num chat de suporte) conseguir injetar comandos, poderá usar a ferramenta `drop_database` ou `export_customer_list` que o agente não precisava ter recebido para responder a dúvidas de Nível 1.
*   **Vazamento Horizontal:** Agentes de Marketing não devem ter ferramentas de faturamento (Billing) no contexto. Um deslize no roteamento da tool pode expor contratos ou cartões de crédito.

### 2. Degradação do Raciocínio (LLM Confusion)
*   **Distração:** Modelos de Função (Function Calling) como GPT-4 e Gemini lidam bem com 3 a 7 ferramentas de cada vez. Passar 25 ferramentas no mesmo nó causa confusão semântica (o LLM "pensa" excessivamente sobre qual usar, errando os parâmetros).
*   **Falhas de "Hallucinated Calls":** O modelo tende a tentar invocar ferramentas que não são relevantes para o escopo apenas porque estão presentes no contexto ("se me deram um martelo, isso deve ser um prego").

### 3. Custo Operacional (Token Bloat e Budget Overflow)
*   As definições (schema JSON) de todas as ferramentas disponíveis são enviadas em **toda requisição** (prompt de sistema oculto) ao modelo. Isso aumenta o custo de tokens de input maciçamente. Em uma execução típica (`tier:medium`), ferramentas inúteis podem dobrar o custo da operação.

## Diretrizes e Mitigações

1.  **Escopo Cirúrgico:** Se o nó precisa apenas ler o nome da empresa, passe a tool `read_company_name`, e não a classe inteira do conector Salesforce `salesforce_admin_client`.
2.  **Validação no Manifesto (Gatekeeper):** O pipeline de curadoria (vide Política de Curadoria em `docs/agent-packs/politica_curadoria.md`) rejeitará manifestos com mais de 7 ferramentas associadas a uma única Skill ou que violem a separação de domínios.
3.  **Roteamento (Supervisor Agent):** Se um problema requer 20 ferramentas diferentes, adote o padrão "Supervisor" do LangGraph, onde o agente principal delega a agentes menores (Sub-Graphs), cada um com acesso a apenas 2 ou 3 ferramentas hiperespecíficas.
