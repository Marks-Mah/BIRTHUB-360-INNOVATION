# ADR-014: Arquitetura de Agent Engine (LangChain/LlamaIndex vs Custom Core)

## Status
Aceito

## Contexto
O BirthHub360 exige uma arquitetura robusta, performática e controlável para a orquestração e execução de seus Agentes de IA. Diante de frameworks populares de abstração de LLMs, como LangChain e LlamaIndex, precisamos avaliar se eles atendem aos nossos rigorosos requisitos de escalabilidade, observabilidade e gerenciamento de permissões/políticas.

O LangChain, embora popular, muitas vezes introduz *over-abstraction*, aumentando o peso, dificultando o controle preciso do fluxo de tokens, escondendo a complexidade e tornando mais difícil implementar lógicas estritas como controle default-deny de ferramentas (ADR-015), sandboxing rigoroso e idempotência em filas de execução.

## Decisão
Decidimos **construir um Custom Core TypeScript sobre provedores puros** (ex: usando SDKs oficiais da OpenAI ou Anthropic diretamente) para a Agent Engine, em vez de depender inteiramente do LangChain.

1.  **Custom Core TypeScript:** Desenvolver o motor de execução internamente para garantir controle granular sobre as chamadas ao LLM, janelas de contexto, execução de ferramentas e tratamento de erros.
2.  **Evitar Over-Abstraction:** O Custom Core interage diretamente com as APIs dos provedores de LLM. O LangChain só será utilizado em casos muito específicos e isolados onde sua utilidade seja inquestionável e não interfira no *Agent Core Workflow* primário.
3.  **Performance e Previsibilidade:** Facilita o mapeamento exato do consumo de tokens (Budget Tracking), latência (SLIs) e gerenciamento de memórias (TTL, Truncamento).
4.  **Integração com Policy Engine:** Permite aplicar nossa Policy Engine com rigor de `Default-Deny` interceptando I/O puro no nível do *framework*, sem caixas pretas.

## Consequências

### Positivas
*   Controle total sobre *prompts*, latência, tokens consumidos e fluxo de execução.
*   Motor de execução otimizado, leve e com menor sobrecarga computacional.
*   Maior segurança, garantindo a interceptação direta de cada chamada de ferramenta na Policy Engine.
*   Simplicidade e testabilidade da lógica de orquestração.

### Negativas / Riscos Assumidos
*   Maior tempo de desenvolvimento inicial da Engine Customizada comparado a soluções "plug and play".
*   Responsabilidade integral pela manutenção e compatibilidade com novos provedores de modelos (ex: adaptar manualmente se a estrutura de resposta da OpenAI mudar).
*   Necessidade de implementar e gerenciar os algoritmos de Retry, Memory Compression e Parse de Respostas internamente.