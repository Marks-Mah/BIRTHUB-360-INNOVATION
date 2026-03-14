# Guia de Contribuição: Escrevendo Agent Manifests

Este guia visa instruir desenvolvedores na criação de arquivos `manifest.yaml` válidos, testáveis e com semântica clara para a publicação de Agent Packs no BirthHub360.

## 1. Estrutura Base
O arquivo `manifest.yaml` deve residir na raiz do seu Agent Pack.
Ele deve conter os seguintes blocos principais:
- `name` e `version` (SemVer obrigatório)
- `description` clara e baseada no valor de negócio.
- `author` e `contact`
- `capabilities`: Array estrito (read, write, execute, notify).
- `tools`: Definição estruturada usando referências compatíveis com Pydantic BaseModels para Input e Output.

## 2. Validade e Tipagem
Não utilize tipos genéricos (`Any`, `dict` aberto). Defina os esquemas de entrada das suas ferramentas (tools) explicitamente. Isso permite que nossa infraestrutura auto-gere interfaces no Agent Studio e restrinja as invocações de IA a limites seguros.
Os objetos do manifesto são validados com `z.object(...).strict()`: qualquer chave extra fora do contrato publicado é rejeitada no parser e bloqueia a publicação no catálogo.

## 3. Testabilidade
Um manifesto é considerado testável se ele detalhar exatamente os *outputs* esperados para os testes de integração. Certifique-se de que cada "tool" referenciada no manifesto possua uma contraparte testável simulada (Mock) declarada na suíte de testes do pacote.

## 4. Semântica e Coesão
Utilize *snake_case* para o nome de todas as ferramentas com verbos de ação claros.
- **Ruim**: `dados_crm` ou `fetch`
- **Bom**: `search_crm_leads` ou `update_billing_status`

---

**Assinatura Digital (Executor):**
`[SIG_HASH: JULES-4.1.J3-f5e4d3c2]`

**Assinatura Digital (Validador):**
`[SIG_HASH: CODEX-4.1.J3-VALIDATED-i9j0k1l2]`
