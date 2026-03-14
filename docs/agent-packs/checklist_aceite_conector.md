# Checklist de Aceite para Novos Conectores

Antes de fundir (merge) um novo Conector na branch `main` e disponibilizá-lo para a criação de Agent Packs no BirthHub360, o revisor (humano ou o Agente JULES) deve verificar rigorosamente os seguintes critérios.

## 1. Arquitetura e Resiliência (Conforme ADR-021)
- [ ] O conector implementa timeouts explícitos para todas as chamadas de rede (HTTP, gRPC)?
- [ ] As falhas transientes (429, 502, 503, 504) estão envoltas por decorators de `Retry` (backoff exponencial)?
- [ ] O conector suporta ou se acopla a uma solução de Circuit Breaker para evitar *cascading failures* no sistema principal?
- [ ] O conector lança `AgentToolError` com mensagens contextuais em vez de expor stacktraces não tratadas de dependências (ex: `requests.exceptions.ConnectionError`)?

## 2. Autenticação e Credenciais (Conforme Least Privilege)
- [ ] O código **NÃO** contém tokens fixos (hardcoded) ou client_secrets visíveis?
- [ ] As credenciais são carregadas dinamicamente via o injetor seguro (contexto) do ambiente em execução (AWS Secrets Manager ou Vault interno)?
- [ ] (Se OAuth 2.0) O conector solicita unicamente os *Scopes* necessários para as funções que promete realizar, evitando escopos de administração global?
- [ ] O conector consegue tratar (refresh) tokens expirados sem interromper bruscamente o fluxo do agente, devolvendo `HTTP 401 Unauthorized` mapeado para um reauth flow ou alertando o Human-In-The-Loop?

## 3. Segurança e Prevenção de Abuso
- [ ] Validação de Input (SSRF): A URL alvo (se parametrizável pelo LLM) é restrita a uma *allowlist* ou domínio predefinido?
- [ ] As cargas sensíveis (ex: PI ou Dados Financeiros) estão mascaradas nos logs e eventos do orquestrador?

## 4. Testes e Mocks
- [ ] Os conectores estão cobertos por testes (min. 80%) de integração utilizando mocks da biblioteca HTTP (ex: `responses`, `httpx-mock`) ou vcr.py para simular respostas reais?
- [ ] Existem casos de teste validadando a degradação graciosa (Negative Testing) quando o serviço parceiro retorna Timeouts ou status 500?

## Aprovação Final
Se todos os checks acima estiverem marcados e as CI Builds estiverem "Verdes", o conector é considerado `stable` e apto para ser instanciado em Tools do ecossistema de agentes.
