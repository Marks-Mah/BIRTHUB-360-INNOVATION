# Documentação OpenAPI/Swagger

Toda rota exposta pela API deve obrigatoriamente possuir:
- Sumário explicativo.
- Descrição clara das respostas de sucesso (ex: 200, 201) com schemas tipados (gerados via Zod to OpenAPI).
- Descrição dos possíveis erros de cliente (400 BadRequest, 401 Unauthorized, 403 Forbidden).
- Descrição para erros de servidor (500 Internal Server Error) formatados segundo a RFC 7807 (Problem Details).
