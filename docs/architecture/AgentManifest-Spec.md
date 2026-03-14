# AgentManifest Specification

**Objectivo:** Estabelecer a definição formal do Manifest dos Agentes.

## Base Schema (Zod)
A base do Manifesto de Agente deve sempre incluir as seguintes chaves obrigatoriamente (strict):

*   **name**: String, 1-120 caracteres.
*   **version** (ou via apiVersion/manifestVersion): Representação SemVer do manifesto.
*   **system_prompt** (ou prompt): String que atua como contexto instrucional primário do Agente.
*   **tools[]**: Array de referências de ferramentas (ID da ferramenta, limites).
*   **memory_ttl**: Número que estipula o tempo (em segundos) que a memória do agente é persistida.

## Parsing e Error Handling
Se o Manifesto for submetido via UI ou CLI, o Zod deve utilizar `strict()` para não aceitar chaves ocultas e perigosas.

As mensagens de erro do Zod não podem vazar estrutura interna de servidor e devem ser amigáveis e precisas:
*   Ao invés de `"Expected array, received object at tools"`, o parser deve mapear para `"O campo 'tools' precisa ser um array"`.
*   A incompatibilidade de versões (ex: submetido v2 enquanto suportamos v1) deve disparar um erro claro de `AgentManifestParseError` rejeitando o processamento.