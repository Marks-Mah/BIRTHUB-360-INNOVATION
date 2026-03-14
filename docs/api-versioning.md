# Política de Versionamento de API

## Convenção
- APIs públicas devem usar prefixo `/api/v{major}`.
- Mudanças compatíveis (adição de campos opcionais) não alteram major.
- Mudanças incompatíveis exigem nova major (`v2`, `v3`, ...).

## Regras de compatibilidade
1. Nunca remover campos sem período de depreciação.
2. Novos campos devem ser opcionais por padrão.
3. Enum só pode ser expandido; remoções exigem major.
4. Mudança de semântica de campo exige major.

## Lifecycle de versões
- **Current:** versão recomendada.
- **Supported:** versões ainda atendidas com correções críticas.
- **Deprecated:** versão com prazo de retirada comunicado.
- **Sunset:** versão removida.

## Comunicação
- Toda depreciação deve incluir:
  - Data de anúncio
  - Data de sunset
  - Guia de migração
  - Contato do time responsável
