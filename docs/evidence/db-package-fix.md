# Resumo da Correção

O monorepo BirthHub estava apresentando falhas de importação nos testes de integração do `api-gateway` e em outros locais com a mensagem `"The requested module '@birthub/db' does not provide an export named 'prisma'"`. A causa raiz era que o pacote `@birthub/db` não tinha uma estrutura válida de ESM/NodeNext, nem compilação de fato para que os importadores pudessem consumir adequadamente a exportação nominal do Prisma.

## Alterações Realizadas

1.  **Reestruturação do Diretório:**
    - Criamos a pasta `packages/db/src`.
    - Movemos o entrypoint principal para `packages/db/src/index.ts`.

2.  **Ajuste da Exportação do Prisma:**
    - No arquivo `src/index.ts`, garantimos que `prisma` é uma exportação nomeada e que o pacote re-exporta tudo do cliente do Prisma:
      ```typescript
      import { PrismaClient } from "@prisma/client";
      export const prisma = new PrismaClient();
      export * from "@prisma/client";
      ```

3.  **Atualização de Configurações ESM/NodeNext:**
    - Em `packages/db/package.json`:
      ```json
      {
        "name": "@birthub/db",
        "type": "module",
        "main": "./dist/index.js",
        "types": "./dist/index.d.ts",
        "exports": {
          ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
          }
        },
        "scripts": {
          "build": "tsc -p tsconfig.json",
          "generate": "prisma generate"
        }
      }
      ```
    - Em `packages/db/tsconfig.json`:
      ```json
      {
        "compilerOptions": {
          "target": "ES2022",
          "module": "NodeNext",
          "moduleResolution": "NodeNext",
          "declaration": true,
          "outDir": "dist",
          "rootDir": "src",
          "verbatimModuleSyntax": true,
          "isolatedModules": true
        }
      }
      ```

4.  **Correção do Schema do Prisma:**
    - Foram corrigidas ambíguidades, duplicações (como o duplo `refreshTokens`) e tipos que haviam sumido do arquivo `packages/db/prisma/schema.prisma` para garantir que o client compilasse.

## Resultado do Build

O comando `npx prisma generate && pnpm build` dentro da pasta `packages/db` rodou com sucesso, criando as tipagens em `dist/index.d.ts` e o arquivo rodável em `dist/index.js`.

## Resultado dos Testes

O Node conseguiu resolver o pacote `@birthub/db` pelo seu entrypoint público (`@birthub/db` que redireciona para `./dist/index.js`). Os testes do `api-gateway` deixaram de lançar erros de sintaxe ou módulo não encontrado, terminando em 73 passes no total (`pnpm test --filter=@birthub/api-gateway`).
