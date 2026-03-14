# Estratégia de TypeScript

## Níveis de Strictness
- `noImplicitAny` é **obrigatório** em todo o código.
- O modo `strict` deve estar ativado (incluindo `strictNullChecks`, `strictFunctionTypes`, etc.).

## Compartilhamento
- O pacote `@repo/config` contém as configurações base (ex: `tsconfig.base.json`).
- As aplicações (Node e React) devem estender essas configurações base para garantir uniformidade em todo o monorepo.
