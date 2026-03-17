# Onboarding do Desenvolvedor

Bem-vindo ao BirthHub360. Para iniciar o desenvolvimento:

1. Clone o repositorio.
2. Certifique-se de ter Docker Desktop com WSL2/Virtual Machine Platform habilitados no Windows, ou Docker Engine no Linux/macOS, alem de Node 22+ e pnpm 9.1+.
3. Copie as variaveis de ambiente: `cp .env.example .env`
   Nao fixe `NODE_ENV` no `.env`; `pnpm dev` e o pipeline de build definem esse valor automaticamente.
4. Rode o script de setup: `./scripts/setup/setup-local.sh`
5. Inicie a aplicacao com `pnpm dev`.

Se o Docker Desktop responder com erro do engine Linux ou HTTP 500 ao subir `postgres` ou `redis`, habilite WSL2 e a feature `Virtual Machine Platform` antes de repetir o bootstrap local.
