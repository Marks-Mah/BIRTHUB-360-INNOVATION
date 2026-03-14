# ADR-020: Design de Skill Templates — Composição vs Herança

## Status
Aceito

## Contexto
O BirthHub360 utiliza "Skill Templates" como blocos fundamentais de lógica conversacional e interação de ferramentas (tools) para compor os Agent Packs. Existe a necessidade de decidir se a arquitetura desses templates favorecerá a herança orientada a objetos (BaseSkill -> SalesSkill -> SDRSkill) ou a composição (um agente "possui" múltiplas skills independentes).

## Decisão
Os Agent Packs adotarão **Composição sobre Herança** para a estrutura de seus Skill Templates.

1.  **Composição no LangGraph:** Cada Skill será desenhada como um nó (Node) ou um sub-grafo autônomo no `StateGraph` do LangGraph, recebendo o estado global do agente e devolvendo uma atualização de estado parcial.
2.  **Acoplamento Fraco:** As Skills não compartilharão uma classe base profunda. Em vez disso, todas seguirão um contrato operacional padrão (interface) ditado pela Plataforma: devem aceitar um `AgentState` e emitir `actions_taken` e eventos de saída.
3.  **Configuração Declarativa:** O `manifest.yaml` declarará quais Skills o agente possui (ex: `skills: [qualificacao_lead, analise_competitiva]`), e o compilador de grafo do `BaseAgent` importará e conectará (comporá) esses sub-grafos em tempo de execução.

## Consequências
*   **Testabilidade Elevada:** Ao desacoplar via composição, cada Skill Template pode ser testada de forma unitária, mockando apenas seu input de estado e validando seu output, sem se preocupar com efeitos colaterais de uma hierarquia complexa.
*   **Reuso Seguro:** Uma skill genérica (ex: `agendar_reuniao`) pode ser embutida tanto no SDRAgent quanto no CSM sem necessitar de uma classe ancestral comum.
*   **Menos "Spaghetti Code":** Evita-se o problema do "gorila com a banana e toda a selva", comum em herança profunda na arquitetura de IA.
