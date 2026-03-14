# Análise de Gap da Knowledge Base (Matriz Risco-Suporte) - BirthHub 360

## Objetivo
Criar uma estrutura e matriz de análise para identificar funcionalidades (Features) ativas na plataforma que não possuem cobertura adequada de documentação na Knowledge Base (KB), cruzando essa ausência com o volume de tickets de suporte recebidos.

## Metodologia de Identificação de Gaps

A análise de gap é realizada cruzando três fontes de dados mensais:
1. **Lista de Features em Produção:** Extraída do repositório/changelog.
2. **Volume de Tickets (Tags):** Tags aplicadas aos tickets (ex: `bug_oauth`, `ajuda_prompt`).
3. **Métricas da KB (Buscas sem resultados - Zero-Result Searches):** Termos que usuários pesquisaram na central de ajuda mas não encontraram nenhum artigo.

## Matriz de Priorização (Ação por Quadrante)

A análise gera uma matriz 2x2 baseada em **Volume de Tickets Relacionados** (Eixo Y) vs **Cobertura da KB Existente** (Eixo X):

### Quadrante 1: O Fogo (Alta Prioridade)
- **Cenário:** Alto Volume de Tickets (> 50/mês) + Cobertura da KB Fraca/Inexistente.
- **Sintoma:** O time de CS está agindo como "leitores de manual manuais" para uma feature obscura. Exemplo recorrente: "Configuração avançada de SMTP personalizado para o Agente SDR".
- **Ação Imediata:** Redação urgente (SLA 48h) de guias passo a passo e tutoriais em vídeo.

### Quadrante 2: A Falsa Sensação de Segurança
- **Cenário:** Alto Volume de Tickets + Cobertura da KB Alta (muitos artigos).
- **Sintoma:** Os artigos existem, mas são inúteis, desatualizados ou o problema é puramente um erro de usabilidade (UX bug) que documentação não resolve.
- **Ação Imediata:** Não escrever mais artigos. Enviar o feedback para o time de Produto/Design para repensar o fluxo da interface.

### Quadrante 3: O Custo de Manutenção (Baixa Prioridade)
- **Cenário:** Baixo Volume de Tickets + Cobertura da KB Alta.
- **Sintoma:** Escrevemos 10 artigos sobre como "Mudar a foto de perfil", mas ninguém liga para isso.
- **Ação Imediata:** Congelar atualizações nestes artigos. Focar energia em áreas de maior fricção.

### Quadrante 4: O "Modo Silencioso" (Monitorar)
- **Cenário:** Baixo Volume de Tickets + Cobertura da KB Baixa.
- **Sintoma:** Uma nova funcionalidade beta, ou algo muito intuitivo que ninguém precisa de ajuda para usar.
- **Ação Imediata:** Nenhuma. Monitorar o aumento de uso via telemetria antes de investir tempo escrevendo documentação pesada.

## Relatório de Zero-Result Searches
Todo final de mês, a ferramenta de KB deve exportar as palavras que os usuários digitaram e retornaram "0 artigos encontrados". Ex: Se 30 pessoas buscarem "Cancelamento", a KB deve ter um artigo com este título exato (mesmo que seja apenas um formulário de contato), preenchendo o gap de expectativa de navegação.
