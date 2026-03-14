# Política de Content-Type da API

A API aceita estritamente o `Content-Type: application/json` para rotas de mutação (POST, PUT, PATCH).
- Uploads diretos de `multipart/form-data` são bloqueados na API core.
- Arquivos devem ser upados via URLs pré-assinadas (Presigned URLs) de um bucket S3 ou serviços similares.
