# ADR-007: Multi-tenancy Strategy — Shared Schema with RLS vs. Schema per Tenant

## Status
Accepted

## Context
BirthHub360 is a multi-tenant SaaS application that serves multiple organizations. We need to define our architectural approach for database isolation across tenants. We evaluated two primary strategies:
1.  **Shared Schema with Row-Level Security (RLS)**: All tenants share the same database tables, and access is controlled via PostgreSQL RLS policies based on the current tenant context.
2.  **Schema per Tenant**: Each tenant gets its own dedicated database schema, separating data completely at the schema level.

## Decision
We have decided to adopt **Shared Schema with Row-Level Security (RLS)** as our primary multi-tenancy strategy.

## Rationale
*   **Scalability**: A shared schema scales significantly better when dealing with thousands or tens of thousands of tenants. A schema per tenant approach requires excessive migrations and connection pooling overhead.
*   **Maintainability**: Applying migrations and schema changes across a single shared schema is vastly simpler and less error-prone than applying them across potentially thousands of individual schemas.
*   **Performance**: Connection pooling is highly optimized for a single schema. With a schema per tenant, connection counts can balloon, leading to database exhaustion.
*   **Security (with RLS)**: PostgreSQL's Row-Level Security provides robust, database-level guarantees that queries cannot access data outside the defined tenant context, mitigating the risk of application-level bugs causing data leakage.
*   **Cost Efficiency**: Managing a single unified schema is more resource-efficient for our database infrastructure, especially for free or low-usage tiers.

## Consequences
*   **Migration Complexity**: All tables must include a `tenant_id` column. We must ensure every migration strictly adheres to adding RLS policies when creating new tables.
*   **Application Context**: The application must reliably set the `tenant_id` context for the database connection before executing queries. This requires rigorous middleware and connection handling.
*   **Query Performance Tuning**: Indexes must be carefully designed to always include `tenant_id` to ensure queries across large shared tables remain performant.
*   **Risk of Bypass**: Superusers and migration roles bypass RLS. These roles must be strictly controlled and never used for application traffic.
*   **Exceptions**: We must formally define and document any tables that do not require RLS (e.g., global configuration tables).

## Implementation Notes
*   We will leverage PostgreSQL's native RLS capabilities.
*   Application code will use short-lived settings (e.g., `set_config('app.current_tenant_id', ...)` ) to establish the tenant context per transaction.
*   We will require automated checks in our CI/CD pipeline to ensure new tables have appropriate RLS policies applied.
