# Request Context (User/Tenant info)

A extração de informações do token JWT para os requests da API deve seguir o padrão:
- Um middleware ou decorator intercepta a requisição, extrai o Token JWT e injeta os dados de forma tipada no contexto.
- Em aplicações Express/Node, isso será colocado no objeto da requisição (ex: `req.user`, `req.tenantId`).
- Estes dados injetados serão repassados aos Services como argumentos de funções tipados para garantir a segurança no acesso aos dados (Row Level Security no Prisma, por exemplo).
