# Estratégia do arquivo .env.example

Cada nova variável de ambiente adicionada ao sistema (seja em `web.config.ts`, `api.config.ts` ou `worker.config.ts`) deve ser espelhada no arquivo `.env.example`.

Regras:
- O arquivo `.env.example` deve conter um valor de exemplo mockado (dummy) para ajudar no setup de novos desenvolvedores.
- Cada variável deve estar acompanhada de um comentário claro explicando sua utilidade e onde obter seu valor em produção.
