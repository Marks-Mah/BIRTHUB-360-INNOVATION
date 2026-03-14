# New Commercial Agents

This directory contains 10 new AI agents designed for specific commercial roles in the Brazilian market.

## Agents List

1.  **BDR (Business Development Representative)** (`agents/bdr`)
    *   **Role**: Outbound prospecting and lead qualification.
    *   **Tools**: Lead finding, email verification, outreach sequencing.
    *   **Port**: 8009

2.  **Closer** (`agents/closer`)
    *   **Role**: Closing deals and negotiation.
    *   **Tools**: Objection analysis, discount approval, contract drafting.
    *   **Port**: 8010

3.  **Sales Ops** (`agents/sales_ops`)
    *   **Role**: Sales operations, data hygiene, and forecasting.
    *   **Tools**: CRM cleaning, revenue forecasting, lead assignment.
    *   **Port**: 8011

4.  **Enablement** (`agents/enablement`)
    *   **Role**: Sales training and coaching.
    *   **Tools**: Call analysis, coaching cards, training quizzes.
    *   **Port**: 8012

5.  **KAM (Key Account Manager)** (`agents/kam`)
    *   **Role**: Account management and expansion.
    *   **Tools**: Account planning, stakeholder mapping, QBR scheduling.
    *   **Port**: 8013

6.  **Partners** (`agents/partners`)
    *   **Role**: Channel and partner management.
    *   **Tools**: Partner lead registration, commission calculation, collateral sharing.
    *   **Port**: 8014

7.  **Field** (`agents/field`)
    *   **Role**: Field sales and territory management.
    *   **Tools**: Route optimization, visit reporting, inventory checking.
    *   **Port**: 8015

8.  **Pre-Sales** (`agents/pre_sales`)
    *   **Role**: Technical sales support and solution engineering.
    *   **Tools**: Demo generation, RFP answering, feasibility checks.
    *   **Port**: 8016

9.  **Copywriter** (`agents/copywriter`)
    *   **Role**: Sales content generation.
    *   **Tools**: Script generation, email rewriting, social posts.
    *   **Port**: 8017

10. **Social** (`agents/social`)
    *   **Role**: Social selling and engagement.
    *   **Tools**: Profile finding, post commenting, connection requests.
    *   **Port**: 8018

## Shared Infrastructure

*   **Queues**: All agents have dedicated queues defined in `@birthub/shared-types` and configured in `packages/queue`.
*   **Base Agent**: All agents inherit from `BaseAgent` in `agents/shared`, ensuring consistent logging, rate limiting, and observability.
