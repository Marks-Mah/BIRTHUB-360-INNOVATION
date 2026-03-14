# Política de Atualização da Knowledge Base - BirthHub 360

## Objetivo
Garantir que a documentação de ajuda e os guias de uso não fiquem obsoletos, confusos ou desalinhados com os novos "Packs" de Agentes e releases de produto.

## 1. Papéis e Responsabilidades (Quem pode publicar?)

*   **Autores Primários (Rascunho):** Engenheiros de Software, Product Managers e Agentes de Customer Success (CS). Eles identificam a necessidade baseada no lançamento de uma feature ou em um ticket repetitivo e redigem o primeiro draft.
*   **Revisores de UX/Conteúdo (Quality Assurance):** Equipe de Technical Writers ou Product Designers. Eles garantem que a linguagem siga as diretrizes (Corporate Identity) e o formato em `kb_structure.md`.
*   **Publicadores Finais:** Apenas o time de Product Marketing ou Liderança de CS possui permissão no CMS (ex: Zendesk/Intercom) para clicar em "Publicar". A publicação direta por desenvolvedores é proibida para evitar jargões técnicos não lapidados.

## 2. Gatilhos de Atualização (Quando um artigo nasce ou muda?)

*   **Processo de Release (Definition of Done):** Nenhuma nova funcionalidade ("Epic") ou "Agent Pack" importante pode ser marcada como *Concluída* sem que o respectivo artigo da KB seja pelo menos criado em Rascunho.
*   **KCS (Knowledge-Centered Service):** Se um agente humano de suporte responder a mesma dúvida 3 vezes na mesma semana, ele tem a obrigação de gerar uma solicitação (Jira/Linear ticket) para atualizar ou criar um artigo sobre aquele tema específico.

## 3. Frequência de Revisão do Acervo Existente

*   **Auditoria Trimestral (A cada 90 dias):**
    *   Um script automático deve gerar um relatório dos "Top 10 Artigos Mais Acessados" e os "10 Artigos Menos Acessados" no trimestre.
    *   **Top 10:** Devem ser lidos manualmente por um Technical Writer para garantir que as screenshots estão atualizadas com a versão mais recente do dashboard.
    *   **Bottom 10:** Devem ser avaliados para exclusão (arquivamento) ou fusão com outros artigos para reduzir o inchaço (bloat) da base de conhecimento.
*   **Revisão de Desempenho (Thumbs Down):** Qualquer artigo que apresente uma taxa de feedback negativo ("Isto não foi útil") superior a 30% em um mês deve ser colocado imediatamente em revisão (WIP) e reescrito.
