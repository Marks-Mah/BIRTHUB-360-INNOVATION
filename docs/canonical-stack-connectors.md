# Canonical Stack and Connectors

## Canonical source of truth

The production path for the platform is:

- `apps/api`: authenticated CRUD APIs, connector endpoints, workflow control plane, installed agents, budgets and webhooks
- `apps/worker`: async execution, workflow runner, agent runtime, CRM sync, connector side effects and audit persistence
- `packages/agents-core`: manifest catalog, runtime contracts, policy engine, skills and tool abstractions
- `packages/workflows-core`: workflow step schemas, interpolation, node executors and step contracts
- `packages/database`: Prisma schema, migrations and persistence models for executions, connectors, conversations and handoffs

The legacy bridge remains available during migration, but it is not the source of truth for new work:

- `apps/api-gateway`
- `apps/agent-orchestrator`
- Python workers and services under `agents/`

## Canonical connector domain

The canonical connector API lives in `apps/api` under `/api/v1/connectors` and currently exposes:

- `GET /api/v1/connectors`
- `POST /api/v1/connectors`
- `POST /api/v1/connectors/:provider/connect`
- `POST /api/v1/connectors/:provider/callback`
- `GET /api/v1/connectors/:provider/callback`
- `POST /api/v1/connectors/:provider/sync`

Supported providers in the current contract:

- `hubspot`
- `google-workspace`
- `microsoft-graph`
- `salesforce`
- `pipedrive`
- `twilio-whatsapp`

The worker side uses the same canonical action types inside workflows:

- `AGENT_HANDOFF`
- `CRM_UPSERT`
- `WHATSAPP_SEND`
- `GOOGLE_EVENT`
- `MS_EVENT`

## Persistence added for orchestration

The canonical persistence layer now includes:

- `ConnectorAccount`
- `ConnectorCredential`
- `ConnectorSyncCursor`
- `ConversationThread`
- `ConversationMessage`
- `AgentHandoff`

These models are used to keep connector state, cross-agent conversations and workflow handoffs auditable.

## Agent ID normalization

The canonical stack now resolves agent IDs by normalized aliases, so the runtime and marketplace can treat these forms as the same logical agent:

- `pos-venda`
- `pos_venda`
- `Pos Venda`

This avoids propagating legacy naming differences into the new orchestration layer.

## Bootstrap and readiness

Use the canonical stack when working only on the new platform:

```bash
pnpm stack:canonical
```

Use the hybrid stack while the legacy services are still needed:

```bash
pnpm stack:hybrid
```

These scripts wrap the existing readiness checks:

- `pnpm preflight:core`
- `pnpm preflight:full`

And then start the corresponding development topology:

- `pnpm dev`
- `pnpm dev:legacy`

## Required environment for connectors

HubSpot:

- `HUBSPOT_CLIENT_ID`
- `HUBSPOT_CLIENT_SECRET`
- `HUBSPOT_REDIRECT_URI`

Google Workspace:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Microsoft Graph:

- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`

## Current implementation note

The OAuth callback flow is designed to work with provider redirects through the `state` payload, so a logged-in admin session is not required for the GET callback path. Manual POST finalization remains available for authenticated admin operations.
