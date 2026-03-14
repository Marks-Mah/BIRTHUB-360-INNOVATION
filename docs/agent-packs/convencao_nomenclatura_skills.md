# Convenção de Nomenclatura para Skills, Ferramentas e I/O

O BirthHub360 segue um guia de estilo estrito para a nomenclatura dos componentes dos Agent Packs. Isso facilita o parseamento de logs, simplifica a leitura dos schemas JSON injetados no LLM e padroniza a interface via APIs GraphQL/REST.

## 1. Nomenclatura de Skills e Ferramentas (Tools)

*   **Padrão:** As declarações de tools e nós do LangGraph devem utilizar verbos de ação claros e objetivos, separados por underscore (snake_case).
*   **Motivo:** Modelos como o GPT-4/Gemini dependem pesadamente do nome da função para decidir quando invocá-la. Nomes como `processData` ou `runTask1` confundem o modelo.

### Exemplos Certos e Errados

| Ruim | Bom | Explicação |
|---|---|---|
| `crm` | `search_crm_leads` | O modelo sabe exatamente que a tool fará uma busca, e não uma deleção. |
| `do_contract_stuff` | `generate_contract_draft` | Verbo de ação forte ("generate") e objeto claro ("contract_draft"). |
| `SendEmail` | `send_cold_email` | Use snake_case no código e especifique o tipo de ação (email frio, email resposta). |

## 2. Nomenclatura de Campos de Input e Output (I/O)

Os modelos Pydantic e os payloads JSON transitando nos Manifests devem aderir aos seguintes padrões:

*   **Formato:** `snake_case` (ex: `lead_id`, `company_size`, `deal_value`).
*   **Booleanos:** Devem iniciar com prefixos indicando estado ou interrogação (ex: `is_qualified`, `has_budget`, `requires_hitl`).
*   **Identificadores:** Evitar apenas `id`. Especificar o contexto: `contact_id`, `organization_id`, `stripe_customer_id`.
*   **Valores Monetários e Numéricos Específicos:** Deve constar no nome o tipo ou a métrica (ex: `discount_pct` para percentagem, `arr_usd` ou `deal_value` ao invés de apenas `value`).
*   **Datas e Timestamps:** Sufixar com `_at` para timestamps e `_date` para dias lógicos. (ex: `created_at`, `renewal_date`).

## 3. Descrições Semânticas (Docstrings/Field Descriptions)

A nomenclatura isolada não basta. Toda `Tool` deve ter uma docstring explicativa clara e todo campo no Pydantic `Field` **deve** incluir uma propriedade `description`. Isso compõe o prompt invisível de Function Calling.

**Exemplo Completo:**
```python
class SearchLeadInput(BaseModel):
    email_domain: str = Field(
        ...,
        description="Domínio de e-mail da empresa para busca (ex: acme.com). Não incluir @."
    )
    is_active_customer: bool = Field(
        default=False,
        description="Filtrar apenas por leads que já possuem contrato ativo no momento da busca."
    )
```
