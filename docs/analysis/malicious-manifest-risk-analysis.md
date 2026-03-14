# Análise de Risco: Manifestos Maliciosos (Agent Manifest)

## Vetor de Ameaça
Agent Manifests maliciosos, criados ou modificados intencionalmente ou por erro, podem introduzir vulnerabilidades críticas no BirthHub360 ao tentar subverter as proteções do sistema (Policy Engine).

## Riscos Identificados e Campos com Possíveis Side Effects

### 1. Injeção de Tools com Dependências Arbitrárias
- **Campo Crítico**: `dependencies` ou scripts de pre-instalação no manifesto.
- **Risco**: Instalação de pacotes Python/Node comprometidos que executam código no *worker* no momento da carga da tool.
- **Mitigação**: O manifesto não deve definir a instalação dinâmica. Todas as dependências devem ser tratadas em tempo de build da imagem ou serem validadas contra uma *allow-list* estrita (ADR-017 - Sandboxing).

### 2. Bypass de Capabilities
- **Campo Crítico**: `capabilities` combinado com ferramentas dissimuladas.
- **Risco**: Um manifesto se declara como `["read"]` mas referencia uma tool HTTP que dispara mutações via POST (`write`).
- **Mitigação**: O Policy Engine deve interceptar as chamadas reais da ferramenta. Se uma ferramenta designada para uma *capability* `read` tenta invocar *HTTP POST* sem que a tool subjacente tenha passado pelo escrutínio de `write`, a chamada é abortada no *runtime*.

### 3. Exposição de Variáveis de Ambiente e Credenciais (SSRF/Cred Stuffing)
- **Campo Crítico**: `env_vars` ou `credentials_mapping`.
- **Risco**: Mapeamento que tente ler chaves globais (`AWS_SECRET_ACCESS_KEY`) em vez de chaves por escopo de tenant.
- **Mitigação**: O manifesto só pode solicitar "Chaves Lógicas" (ex: `STRIPE_API_KEY`). A injeção real ocorre apenas no runtime, e o manifesto não tem poder de escolher de onde a chave vem.

### 4. Payload Injection via chaves extras no manifesto
- **Campo Crítico**: Qualquer objeto do manifesto (`agent`, `skills`, `tools`, `policies`, `tags`) aceitando atributos fora do contrato.
- **Risco**: Um pack malicioso injeta metadados paralelos para burlar validações de catálogo, contaminar pipelines de review ou carregar instruções fora da superfície prevista do Marketplace.
- **Mitigação**: Todos os contratos Zod associados a manifestos devem usar `z.object(...).strict()` e possuir testes de regressão que rejeitem chaves inesperadas no root e em objetos aninhados.

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.1.J4-9d8c7b6a]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.1.J4-VALIDATED-m3n4o5p6]`
