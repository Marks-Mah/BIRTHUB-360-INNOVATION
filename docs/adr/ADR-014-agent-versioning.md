# ADR-014: Versionamento de Agentes (SemVer vs Data-based) e Breaking Changes

## Status
Aceito

## Contexto
O BirthHub360 atua com diversos manifestos de agentes (Agent Packs). Devido à dependência de terceiros e fluxos contínuos de execução de agentes (workflows), é fundamental decidir como essas versões serão registradas e mantidas.

## Decisão
Nós optamos pelo uso do **Semantic Versioning (SemVer 2.0.0)** em todos os manifests, em detrimento do versionamento por datas (Data-based/CalVer).

1. **Maior (Major)**: Quando há *breaking changes* incompatíveis com a versão anterior (ex.: alteração em propriedades obrigatórias de *tools*, remoção de uma *capability*, ou alteração de *LLM output schema* que quebra as integrações).
2. **Menor (Minor)**: Quando se adiciona funcionalidades retrocompatíveis (ex.: nova tool opcional, expansão dos exemplos de few-shot, otimização de prompt que mantém a saída).
3. **Correção (Patch)**: Ajustes de pequenos bugs, documentação ou logs, com nenhuma alteração de schema ou de política.

## Política de Breaking Changes
Quaisquer *breaking changes* publicadas devem seguir a política de deprecação estrita, sem atualizações forçadas (force updates) na V2 para clientes estabelecidos. Clientes sempre têm o direito a opt-in explícito nas atualizações "Major".

## Consequências
- Exigência do uso estrito de schemas Pydantic no contrato das ferramentas para automatizar a detecção de quebras de contrato em um pipeline de CI/CD.
- Maior complexidade na gerência de instâncias de agentes simultâneos, obrigando o suporte à coexistência de múltiplas "Majors" na base de código.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.2.J1-c1d2e3f4]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.2.J1-VALIDATED-x1y2z3a4]`
