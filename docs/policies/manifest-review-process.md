# Política: Processo de Revisão de Manifest

## Objetivo
Garantir que nenhum *Agent Pack* (novo ou atualizado) seja disponibilizado aos tenants sem passar por verificações de segurança, estabilidade e conformidade.

## Critérios de Aprovação

1. **Validação Estrutural**: O manifesto passa no validador Pydantic. Não há campos desconhecidos ou malformados.
2. **Cobertura de Testes**: Mínimo de 80% de coverage nas tools atreladas ao manifesto.
3. **Privilégio Mínimo**: As *capabilities* declaradas refletem estritamente as tools registradas e nada além disso.
4. **LGPD Compliance**: Qualquer tool que processe dados atende as exigências de redação (Data Redaction).

## Quem Aprova
- **Revisão Automatizada**: CI/CD pipeline via GitHub Actions.
- **Aprovação Humana**: Um *Lead Engineer* (ou persona CODEX validando no sistema) deve assinar o PR para aprovar o merge do manifest. Em caso de *Agent Packs* públicos (Marketplace), requer aprovação do Comitê de Governança.

## SLA de Review
- **Minor / Patch Updates**: SLA de 1 dia útil (muitas vezes aprovado automaticamente caso não adicione *tools* novas e os testes passem).
- **Major Updates / Novos Agentes**: SLA de 3 dias úteis para permitir revisão minuciosa de segurança e arquitetura.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.1.J5-1a2b3c4d]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.1.J5-VALIDATED-q7r8s9t0]`
