# Validação de I/O em Skill Templates com Dados de Negócio

Este documento estabelece a exigência e o padrão de validação dos inputs e outputs (I/O) para os "Skill Templates" que compõem os Agent Packs do BirthHub360.

## Premissa Fundamental

Um Skill Template só pode ser aprovado e distribuído no repositório corporativo se possuir uma definição formal de Schema Pydantic para sua entrada (Input) e saída (Output), garantindo testabilidade e integração determinística com outros nós do LangGraph.

## Regras de Schema

1.  **Tipagem Estrita (Pydantic):** Todas as assinaturas de Skills e Tools subjacentes devem utilizar Pydantic BaseModels (ou classes TypeDict anotadas para o StateGraph) especificando os dados requeridos.
2.  **Dados Reais de Negócio:** Os testes unitários associados a uma Skill não devem empregar `foo`/`bar`. Devem utilizar payloads de "mock realistas" provenientes dos domínios atendidos (ex: IDs de leads similares aos do Salesforce, textos reais de e-mails B2B, valores contratuais plausíveis).
3.  **Validação de Limites:** Valores monetários (`deal_value`), percentuais (`discount_pct`), e datas devem ser checados com os métodos `@validator` ou `Field()` do Pydantic para evitar "alucinações matemáticas" do LLM antes que o estado seja retornado ao ciclo principal.

## Exemplo de Validação Testável

### Input Model
```python
from pydantic import BaseModel, Field, field_validator

class QualifyLeadInput(BaseModel):
    lead_id: str = Field(..., description="ID no CRM")
    company_size: int = Field(..., ge=1, description="Número de funcionários")
    budget_range: str = Field(..., description="Faixa de investimento, ex: 10k-50k")

    @field_validator("lead_id")
    def validate_id_format(cls, v):
        if not v.startswith("LD-"):
            raise ValueError("ID de lead inválido. Deve começar com LD-")
        return v
```

### Output Model
```python
class QualifyLeadOutput(BaseModel):
    is_qualified: bool
    score: int = Field(ge=0, le=100)
    reason: str
    next_action_recommended: str
```

## Benefícios na Testabilidade

1.  **Mocks Estruturais:** Permite testes paramétricos automáticos passando JSONs extraídos do sistema em produção.
2.  **Schema Enforcement pelo LLM:** Modelos modernos de LLM (ex: Function Calling do OpenAI / Gemini) suportam a injeção do schema JSON, garantindo que o agente estruture sua resposta exatamente conforme o `QualifyLeadOutput`, reduzindo falhas de parseamento.
