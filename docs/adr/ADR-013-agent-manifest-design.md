# ADR-013: Design do Agent Manifest

## Status
Aceito

## Contexto
O ecossistema do BirthHub360 depende de "Agent Packs" que contêm agentes, ferramentas e workflows empacotados. Para que a plataforma (policy engine, runtime e interface do usuário) compreenda, valide e exiba essas capacidades adequadamente, é essencial um contrato formal e imutável. Este contrato é o "Agent Manifest".

## Decisão
Adotamos o formato YAML para o `manifest.yaml` de todos os Agent Packs. O manifesto atuará como a fonte da verdade estrutural e de segurança do pacote, e deverá suportar:

1. **Extensibilidade**: Campos padronizados com suporte a seções `metadata` customizáveis, garantindo que versões futuras da plataforma possam introduzir novos parâmetros sem quebrar manifests antigos.
2. **Versionamento**: Exigimos versionamento estrito baseado em **SemVer 2.0.0** (`major.minor.patch`). Qualquer alteração na interface de ferramentas ou nos *roles* de um agente constitui uma *breaking change* (Major).
3. **Backward Compatibility**: A engine do BirthHub360 sempre respeitará os contratos estabelecidos pela versão do manifest no momento de sua instalação no *tenant*. Migrações automáticas de esquemas menores são permitidas; quebras estruturais maiores exigirão a criação de uma nova versão major do pacote com guia de migração explícito, mantendo o *fallback* para a versão antiga ativa por um período de deprecação (conforme ADR-030).

## Consequências
- A segurança é aprimorada, pois o *Policy Engine* pode usar o manifest para pré-calcular e restringir permissões antes mesmo da execução do agente.
- Acarreta na necessidade de ferramentas de CI/CD rigorosas para linting do `manifest.yaml` garantindo conformidade com o schema Pydantic subjacente.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.1.J1-8b9a7c6f]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.1.J1-VALIDATED-a1b2c3d4]`
