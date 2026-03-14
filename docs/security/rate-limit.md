# Estrutura de Rate Limiting por Tier

O Rate Limiting deve ser aplicado na camada de Gateway ou API (middleware) conforme os limites abaixo:
- **Requisições Anônimas (Por IP):** 100 requisições por minuto.
- **Requisições Autenticadas (Por API Key/Token):** 1000 requisições por minuto.
