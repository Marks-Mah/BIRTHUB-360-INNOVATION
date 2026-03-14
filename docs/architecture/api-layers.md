# Padrão Arquitetural de API

A arquitetura das APIs Node.js deve seguir o padrão em camadas (Layered Arch):
- **Controllers:** Lidam com requests, responses e chamadas de serviços. É **proibido** realizar queries (ex: Prisma) diretamente do Controller.
- **Services:** Contêm a lógica de negócio. Recebem os dados do Controller e repassam aos Repositories ou chamam o Prisma Client injetado.
- **Repositories:** Abstração de acesso a dados (opcional caso o Prisma já seja usado ativamente nos services).
