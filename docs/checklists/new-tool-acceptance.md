# Critérios de Aceite para Novas Ferramentas (Tools)

Antes de uma nova Ferramenta (Tool) ser incorporada ao catálogo do Agent Core ou a um Agente específico no ecossistema BirthHub360, ela deve ser rigorosamente avaliada. Este checklist define o "Definition of Done" (DoD) que o agente de engenharia (JULES) e revisores humanos devem garantir no PR.

**Nome da Ferramenta:** ________________________
**Agente Associado (se houver):** ________________________
**Revisor (JULES / Code Owner):** ________________________

---

## 1. Contrato de Interface (Pydantic Schema)
O ponto de entrada da ferramenta é validado pelo orquestrador antes da execução real.
*   [ ] O modelo Pydantic de entrada (`ArgsSchema`) possui docstrings claras e tipagem forte (ex: `str`, `int`, `List[str]`).
*   [ ] Campos opcionais estão corretamente definidos com `Optional[...]` e valores padrão (defaults).
*   [ ] Restrições de tamanho/formato foram aplicadas (ex: `Field(..., max_length=255)`, regex para e-mails) para evitar payloads massivos vindos de um LLM alucinando.
*   [ ] A docstring principal da classe/função da ferramenta (que será passada ao LLM) instrui corretamente o modelo *como e quando* usar a ferramenta, descrevendo seus limites e efeitos colaterais.

## 2. Resiliência e Timeouts (ADR-017)
O código não pode bloquear o Worker infinitamente.
*   [ ] A implementação principal (`def _run(...)` ou `async def _arun(...)`) utiliza chamadas assíncronas (`asyncio`) para operações de rede/I-O (banco de dados, HTTP).
*   [ ] Hard timeouts locais estão configurados na própria ferramenta (ex: `httpx.AsyncClient(timeout=10.0)`).
*   [ ] A ferramenta trata corretamente as exceções de timeout (`asyncio.TimeoutError` ou similares) e retorna uma mensagem de erro semântica ao LLM (ex: `"O sistema externo demorou muito a responder. Tente novamente mais tarde."`), evitando que o erro estoure e derrube o job inteiro.

## 3. Segurança e SSRF (Third-Party Tools)
Proteções contra execução arbitrária e vazamento de dados.
*   [ ] A ferramenta **NÃO** expõe uma porta para injetar URLs ou IPs arbitrários no input do LLM, a menos que estritamente necessário (e justificado no PR).
*   [ ] Se a ferramenta faz requisições HTTP para fora do cluster, ela utiliza o cliente HTTP seguro (`SandboxedHttpClient`) fornecido pelo framework, que bloqueia IPs de redes privadas (RFC 1918) e Cloud Metadata (`169.254.169.254`).
*   [ ] Credenciais (API Keys, tokens) NÃO estão hardcoded no código da ferramenta. Elas são recebidas via injeção de dependência do contexto da execução (ou recuperadas do Vault/Secrets Manager em runtime).

## 4. Ocultação de PII e Auditoria (Logging)
Adequação à LGPD e políticas de observabilidade.
*   [ ] Se a ferramenta transita dados Pessoalmente Identificáveis (PII) críticos (CPFs, Cartões de Crédito), ela implementa a ofuscação (`[REDACTED]`) antes de gravar `print()` ou `logger.info()` (Conforme Política de PII).
*   [ ] A ferramenta NÃO retorna strings gigantescas que exaurem a janela de contexto do LLM. Se a resposta passar de 5.000 tokens, a ferramenta a trunca ou retorna um resumo indicando que "o resultado foi cortado por ser muito longo".

## 5. Idempotência (Apenas para `write` ou `execute`)
Se a ferramenta altera estado (mutações), ela deve ser segura para retry.
*   [ ] Se a ferramenta cria ou modifica recursos externos (ex: cobrança financeira, envio de e-mail), ela exige uma *Idempotency Key* no payload (ou a gera deterministicamente) para garantir que uma segunda execução acidental (ex: worker crash) não duplique a transação.
*   [ ] A ferramenta documenta (na docstring do código) que ela altera estado no mundo real.

## 6. Cobertura de Testes
*   [ ] Testes unitários (`pytest`) cobrem o "Caminho Feliz" (Happy Path) usando mocks (`pytest-mock` / `responses`) para qualquer chamada externa de API ou Banco de Dados.
*   [ ] Testes cobrem cenários de falha: timeout da API externa, entrada (input) malformada, ou erro 500 do parceiro.
*   [ ] Cobertura de código para a nova ferramenta >= 80%.

## Decisão de Aceite
- [ ] Aprovado para Merge.
- [ ] Bloqueado aguardando ajustes (ver comentários no PR).
