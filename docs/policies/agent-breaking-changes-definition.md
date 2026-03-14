# Definição: Breaking Changes em Agentes

## O que Constitui uma Breaking Change (Gera Major Bump)

1. **Alteração de Assinatura de Ferramenta (Tools)**:
   - Adição de um novo parâmetro `input` obrigatório.
   - Remoção de um parâmetro de `input` existente que era suportado.
   - Mudança no tipo primitivo de um parâmetro (ex.: de `int` para `string`).

2. **Alteração na Semântica de Resposta (Outputs)**:
   - Remoção de chaves ou nós presentes nos `outputs` de ferramentas ou nas portas de saída do grafo.
   - Redução severa nas informações descritivas das respostas estruturadas pelas quais a IA foi previamente configurada para reagir de forma preditiva.

3. **Restrição ou Remoção de Capabilities**:
   - Um agente que antes suportava `execute` agora suporta apenas `read`.

4. **Remoção Suporte de Versões Antigas**:
   - O fim da vida útil (Sunset) de um sistema dependente obrigando a integração com nova API.

## O que NÃO Constitui Breaking Change (Minor ou Patch)

- Adição de um novo parâmetro de input OPCIONAL (com valor default).
- Adição de novas propriedades (chaves) em um dicionário/json de resposta.
- Melhorias nos *system prompts* que não afetam chaves JSON de retorno.
- Atualização em bibliotecas internas que não afetam a assinatura pública das funções (Mocks e Injeções).

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.2.J5-s7t8u9v0]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.2.J5-VALIDATED-n7o8p9q0]`
