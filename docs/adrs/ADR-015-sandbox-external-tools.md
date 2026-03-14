# ADR-015: Sandbox and External Tools (SSRF Protection & Policy Engine)

## Status
Aceito

## Contexto
O BirthHub360 possibilita que os agentes executem ferramentas externas (`tools`) baseadas em requisições de rede (ex: `tool.http`). Isso abre grandes possibilidades para os Tenants, mas também uma superfície significativa de ataques, especificamente Server-Side Request Forgery (SSRF).
Além do SSRF, a liberdade sem restrições dos agentes pode resultar em violação de segurança de informações e sobrecarga não autorizada (orçamento estourado).

## Decisão
Implementamos um modelo restrito de **Sandbox e External Tools** centrado na interceptação rigorosa no nível da Agent Engine e com obrigatoriedade de negação por padrão.

1.  **Proteção contra SSRF:** A ferramenta `tool.http` está expressamente proibida de acessar redes internas, *loopbacks*, e metadados de nuvem. Qualquer URL enviada pelo LLM/Agente para esta ferramenta deve ser validada contra acessos restritos, e especificamente, redes locais como `10.0.0.0/8`, `127.0.0.1`, `169.254.169.254` (Metadata Services da AWS/GCP), `192.168.0.0/16`, e `172.16.0.0/12`.
2.  **Policy Engine "Default-Deny":** O Policy Engine do BirthHub360 (`packages/agents-core/src/policy/engine.ts`) deve **sempre adotar o Default-Deny**. A não ser que haja uma regra explícita de `allow` casando precisamente com a ação e escopo do Agente, a execução da ferramenta será negada (PolicyDeniedError).
3.  **Limite e Timeout Hard-Coded:** Ferramentas externas sempre operam com `maxCalls` e `timeoutMs` estritos, interrompendo *long-polling* abusivo ou *infinite loops* causados pelo LLM.
4.  **Sandbox Isolation:** As ferramentas customizadas que exijam execução de código (ex: sandboxes JS/Python) não devem compartilhar o processo do orquestrador e não terão acesso a nenhum segredo de ambiente além dos injetados via variáveis de sessão controladas.

## Consequências

### Positivas
*   Mitigação completa e testável contra exploração SSRF em recursos internos da infraestrutura do BirthHub360.
*   Controle rígido e granular de segurança em Tenant level sobre as `tools`. O Tenant não faz nada por padrão sem uma permissão proativa.
*   Confinamento dos agentes dentro de seu orçamento e permissões configuradas no Manifesto.

### Negativas / Riscos Assumidos
*   Possibilidade de atrito no *Developer Experience (DX)* com usuários (Tenants) não familiarizados com whitelists e políticas de `allow`, que terão requisições negadas por padrão.
*   Custos adicionais de latência associados à avaliação de políticas (Policy Evaluation) e parsing/verificação de URLs em cada chamada `tool.http`.