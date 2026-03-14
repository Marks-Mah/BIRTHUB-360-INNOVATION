# Contratos internos versionados (gateway ↔ orchestrator ↔ agentes)

## Versão ativa
- `schemaVersion: "v1"`

## Fluxo crítico: Lead Lifecycle
### Input (`LeadLifecycleInput`)
```json
{
  "schemaVersion": "v1",
  "leadId": "lead-123",
  "context": {
    "source": "ads",
    "campaign": "meta-q1"
  }
}
```

### Output (`LeadLifecycleOutput`)
```json
{
  "schemaVersion": "v1",
  "status": "completed",
  "actionsTaken": ["ldr_enrich_completed", "ldr_score_calculated"],
  "score": 87,
  "tier": "T2"
}
```

## Regras de evolução
1. Toda mudança breaking incrementa versão (`v2`, `v3`, ...).
2. Gateway e orchestrator devem aceitar a versão corrente e a imediatamente anterior por uma janela de depreciação.
3. Contract tests no CI validam presença de `schemaVersion` e compatibilidade do registro de contratos.
