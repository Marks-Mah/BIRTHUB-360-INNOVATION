# Regras de Linting e Formatação de Código

## Ferramentas
- **ESLint:** Linter padrão para JavaScript e TypeScript.
- **Prettier:** Formatador de código.

## Regras não-negociáveis do ESLint
- É **proibido** o uso de `var` (usar `let` ou `const`).
- **Ordenação de imports:** Os imports devem ser ordenados de forma consistente (ex: usando o plugin `import/order`).
- Ausência de console.logs em produção (permitido apenas via Logger configurado).
