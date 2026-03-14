# Campos Obrigatórios em Logs e Redação PII

## Introdução

No BirthHub 360, os logs gerados em produção são a principal fonte de telemetria para resolução de incidentes. Para assegurar que as buscas e análises (Elasticsearch/Cloud Logging) funcionem perfeitamente, os logs devem seguir um formato estruturado uniforme (JSON) e proteger Dados Pessoais Identificáveis (PII) de acordo com a LGPD e a GDPR.

## Formato Estruturado Base

Todos os serviços (API Gateway, Agentes Python, Frontends Next.js) devem emitir os logs encapsulados em JSON utilizando a biblioteca de Logging base (`packages/logger` em TS, e configurando `structlog` ou similar no Python). A saída padrão (stdout) DEVE ser JSON, contendo os seguintes campos raiz.

### Campos Obrigatórios para TODO log impresso:

- `timestamp`: Formato ISO-8601 UTC exato de quando ocorreu (ex: `2024-05-15T12:00:00.000Z`).
- `level`: A severidade do evento. Opções estritas: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
- `message`: Uma descrição em linguagem natural da ocorrência. A mensagem deve ser concisa (ex: "Processamento de Webhook da Stripe finalizado").
- `service`: O nome do microserviço/agente emitindo o log (ex: `api-gateway`, `agent-marketing`, `worker-queue`).

### Campos Contextuais Mandatórios (Se em escopo HTTP / Worker):

Sempre que a execução ocorrer em resposta a um request ou job, o Logger central deve auto-injetar:

- `trace_id`: O identificador único da requisição (ex: W3C Trace Context). Fundamental para correlacionar logs de múltiplos serviços.
- `tenant_id`: ID da empresa/cliente (BirthHub é multi-tenant). Para resolver problemas específicos de um cliente rapidamente.
- `user_id`: O ID do usuário (LDR, AE) logado ou ator do sistema (opcional caso seja chamada de sistema/cron).

## Redação PII (Personally Identifiable Information)

Como os agentes lidam com contatos (Marketing/SDR) e pagamentos (Financeiro), muitas vezes o payload de requests tem dados sensíveis. Se esses dados caírem nos logs de infraestrutura, constitui-se uma violação de segurança/LGPD.

### Campos que NUNCA devem aparecer nos Logs (Redact)

O Logger base e os Middlewares de log de Request/Response HTTP devem ser configurados com filtros de "Redaction" que ofusquem qualquer chave nestes padrões (substituindo o valor por `[REDACTED]`):

**1. Credenciais & Autenticação:**

- `password`, `pass`, `pwd`
- `token`, `auth`, `authorization`, `jwt`, `api_key`, `secret`, `access_token`, `refresh_token`

**2. Dados Financeiros Sensíveis (PCI-DSS):**

- `credit_card`, `card_number`, `cvv`, `cvc`, `pan`, `expiration_date`
- `bank_account`, `routing_number`

**3. Dados Pessoais Base (PII Sensível ou Criptografado):**

- `ssn`, `cpf`, `rg`, `document_number`
- Campos contendo chaves privadas de criptografia (certificados, PKCS).

**4. Logs de Payload Geral Cuidado:**

- A gravação de _body_ HTTP completo num nível `INFO` é fortemente desencorajada, exceto para webhooks curtos e limpos. Prefira logar atributos isolados.
- Nomes Próprios, Telefones e Emails: Apesar de não estarem na lista de "redação rígida automática de keys" (porque são úteis para debugar pipelines de Sales/Marketing), não devem ser despejados indiscriminadamente no log e são cobertos por políticas de expurgo automático de Logs em X dias.

### Exemplo de Log Esperado:

```json
{
  "timestamp": "2024-05-15T14:32:10.123Z",
  "level": "INFO",
  "service": "api-gateway",
  "message": "Lead convertido com sucesso.",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "tenant_id": "org_12345",
  "user_id": "usr_9876",
  "duration_ms": 145,
  "http_status": 201
}
```
