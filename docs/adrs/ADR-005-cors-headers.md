# ADR-005: Políticas de CORS e Headers de Segurança

## Decisão
- A política de CORS deve ser de **negação por padrão (default deny)**. As origens permitidas devem ser explicitamente listadas (allowlist).
- Uso obrigatório do **Helmet** no backend (Express/Node) para configuração automática de headers de segurança HTTP.
