# Variáveis de Ambiente Necessárias (V1)

| Variável | Tipo | Descrição | Web | API | Worker | Obrigatoriedade |
| --- | --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | string | Ambiente de execução (`development`, `production`, `test`) | Sim | Sim | Sim | Obrigatório |
| `PORT` | int | Porta de execução do serviço | Sim | Sim | Não | Obrigatório |
| `DATABASE_URL` | string | Connection string do PostgreSQL | Não | Sim | Sim | Obrigatório |
| `NEXT_PUBLIC_API_URL` | string | URL pública da API para consumo do Web | Sim | Não | Não | Obrigatório |
| `REDIS_URL` | string | URL de conexão com Redis | Não | Sim | Sim | Obrigatório |
| `JWT_SECRET` | string | Chave para assinatura de tokens | Não | Sim | Não | Obrigatório |
| `SENTRY_DSN` | string | DSN do Sentry para observability | Sim | Sim | Sim | Opcional |
| `STRIPE_SECRET_KEY` | string | Chave privada do Stripe para Billing | Não | Sim | Sim | Obrigatório |
