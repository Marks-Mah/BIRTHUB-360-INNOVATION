# Política de Deprecação de Agentes

## Objetivo
Garantir previsibilidade para clientes B2B que rodam fluxos de trabalho em produção, evitando que atualizações e descontinuações quebrem seus sistemas operacionais.

## Notice Period
Para atualizações do tipo "Major" que impliquem remoção de uma versão anterior (Sunset):
- **Sunset de Versão**: 6 meses de antecedência.
- **Remoção de Feature/Tool**: 3 meses de antecedência para features que não representam o core do fluxo.

## Migration Guide
Toda *Breaking Change* (Major update) DEVE ser acompanhada de um guia de migração (Migration Guide). O guia deve:
- Listar claramente as mudanças de contratos (`inputs` e `outputs`).
- Fornecer scripts ou exemplos de como converter dados ou chamadas antigas para a nova versão.

## Sunset Date
A *Sunset Date* é a data em que o BirthHub360 se reserva ao direito de recusar qualquer *request* na versão antiga e, possivelmente, forçar a execução via fallback da versão recente. Após a Sunset Date, instâncias e memórias estritamente ligadas ao Agent Pack antigo poderão ser arquivadas a frio.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.2.J2-g5h6i7j8]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.2.J2-VALIDATED-b5c6d7e8]`
