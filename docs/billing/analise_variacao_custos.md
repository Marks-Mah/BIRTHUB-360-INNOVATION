# Análise de Variação de Custo de Agentes (P50 vs P99)

Em sistemas orquestrados por LLMs autônomos, o custo da execução de uma mesma tarefa pode variar drasticamente dependendo do input do usuário e do caminho lógico tomado pelo modelo. Esta análise contrasta a Execução Típica (P50 - Mediana) com os piores cenários observados na cauda longa (P99).

## Definições Estatísticas no Contexto do LangGraph
*   **P50 (Mediana):** O custo em que 50% das execuções terminam abaixo desse valor. Representa o fluxo "feliz", onde os dados são encontrados de primeira.
*   **P99:** O custo em que apenas 1% das execuções são piores. Representa anomalias, loops de reflexão, alucinações de busca e documentos massivos.

## Comparativo por Domínio (Estimativas)

### 1. Domínio: Sales (Agente: SDR)
*   **Ação Típica:** Qualificar Lead via LinkedIn e E-mail.
*   **P50:** $0.05 (4 requisições LLM, 1 tool DaaS).
*   **P99:** $0.65 (Lead sem dados fáceis, modelo entra em loop tentando 5 combinações de nomes de empresa e lendo páginas de "Sobre Nós" via Web Scraper até desistir ou estourar limite de recursão).
*   **Variação (Delta):** 13x

### 2. Domínio: Legal (Agente: Contract Reviewer)
*   **Ação Típica:** Extrair cláusula de rescisão de um NDA.
*   **P50:** $0.15 (1 chamada pesada passando PDF de 10 páginas via RAG/Contexto).
*   **P99:** $3.50 (O cliente subiu um contrato mestre de 300 páginas mal escaneado. O agente fragmentou em dezenas de chunks e acionou modelo Opus/GPT-4 ao invés do mini para extração OCR e reconciliação semântica).
*   **Variação (Delta):** 23x

### 3. Domínio: Marketing (Agente: Social Content)
*   **Ação Típica:** Criar post para LinkedIn com base em URL de blog post.
*   **P50:** $0.01 (Lê texto limpo, 1 chamada de geração criativa).
*   **P99:** $0.04 (Revisou 4 vezes internamente porque a tool de "Verificação de Brand Voice" reprovou o rascunho seguidamente).
*   **Variação (Delta):** 4x

## Observações de Segurança Financeira

O "Risco P99" é a razão pela qual não podemos cobrar um preço fixo ilimitado por agentes de Tiers Medium e High. Se um cliente mal-intencionado descobrir como engatilhar o caminho P99 de um agente (ex: submetendo milhares de PDFs complexos em lote), o custo variável (COGS) irá ultrapassar o valor da licença SaaS em questão de horas.
