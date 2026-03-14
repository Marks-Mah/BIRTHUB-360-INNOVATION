# Checklist de Revisão de Manifest (Pre-Publish)

Este checklist DEVE ser usado no momento de analisar uma Pull Request de alteração/publicação de um Agent Manifest no ambiente do BirthHub360.

- [ ] **SemVer Acurado**: O pulo de versão corresponde à natureza das alterações? (Patch, Minor ou Major).
- [ ] **Validação Pydantic**: A estrutura de todas as "Tools" respeita Pydantic Models válidos.
- [ ] **Princípio de Privilégio Mínimo**: As *capabilities* limitam-se àquilo que é estritamente exercitado no manifest? (Não há `write` extra sem necessidade).
- [ ] **LGPD Ready**: Todos os esquemas e definições que acessam PII aplicam flag de mascaramento (Redaction).
- [ ] **Evita Breaking Change Silenciosa**: Nenhuma propriedade de input foi convertida de opcional para obrigatória disfarçada de Minor update.
- [ ] **Dependências Declaradas**: Nenhuma instalação de pacote maliciosa/dinâmica no script.
- [ ] **Cobertura**: Todos os outputs novos ou modificados estão cobertos por Testes de Integração ou Unitários.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.2.J3-k9l0m1n2]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.2.J3-VALIDATED-f9g0h1i2]`
