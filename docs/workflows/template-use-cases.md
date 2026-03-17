# Workflow Templates: Real-World Use Cases

To validate the utility of the default workflow templates provided in the BirthHub360 Marketplace, we map each template to a documented use case for a fictitious enterprise customer. This ensures our templates solve actual business problems rather than just demonstrating technical capabilities.

## 1. Template: Inbound Lead Qualification & Triage
**Target Persona**: Sales Operations
**Fictitious Company**: *Acme SaaS Corp* (B2B Software, high volume of inbound leads).
*   **The Problem**: Acme's sales team is wasting 40% of their time researching unqualified leads that fill out the "Contact Us" form with generic email addresses (e.g., Gmail) or fake company names.
*   **The Template Solution**:
    1.  **Trigger**: Hubspot Webhook (New Lead Created).
    2.  **ActionStep**: Data Enrichment (Clearbit API) to fetch company size and industry based on domain.
    3.  **AgentStep (SDR Agent)**: Analyzes the enriched data against Acme's Ideal Customer Profile (ICP).
    4.  **ConditionStep**:
        *   If ICP Match = High: Route to `Inside Sales Queue`.
        *   If ICP Match = Low: Send automated Nurture Email and close lead.
*   **Validation**: This template directly impacts the "Lead-to-Opportunity" conversion rate metric.

## 2. Template: High-Risk Churn Intervention
**Target Persona**: Customer Success / Account Management
**Fictitious Company**: *Globex Cloud Hosting* (Enterprise Infrastructure).
*   **The Problem**: Globex is missing early warning signs of enterprise churn. By the time the Account Manager reaches out, the customer has already decided to leave.
*   **The Template Solution**:
    1.  **Trigger**: Custom Event (NPS Survey Score < 6) OR Usage Drop Alert.
    2.  **AgentStep (CSM Agent)**: Reads the last 5 support tickets and the account's usage metrics from the database.
    3.  **ActionStep**: Generates a "Churn Risk Brief" via LLM.
    4.  **ApprovalStep**: Sends the Brief to the assigned Human Account Manager, pausing the workflow. The AM can click "Approve Intervention" or "Ignore False Positive".
    5.  **ActionStep (On Approve)**: Automatically schedules a calendar invite with the customer and applies a 10% discount code to their Stripe account.
*   **Validation**: Validates the Human-in-the-Loop (`ApprovalStep`) combined with API writes.

## 3. Template: Legal Contract Pre-Screening
**Target Persona**: Legal / RevOps
**Fictitious Company**: *Initech Logistics* (Heavy B2B Contracting).
*   **The Problem**: Sales reps send standard MSAs to Legal for review, but frequently forget to fill out required exhibits or use outdated templates, causing a 3-day SLA delay just for initial triage.
*   **The Template Solution**:
    1.  **Trigger**: Salesforce Webhook (Stage changed to "Contract Sent").
    2.  **ActionStep**: Download PDF from Salesforce attachment.
    3.  **AgentStep (Legal Agent)**: Extracts text and checks for:
        *   Is the governing law set to "State of Delaware"?
        *   Is the liability cap standard?
        *   Are all signature blocks present?
    4.  **ConditionStep**:
        *   If Pass: Notify Legal team "Ready for Final Review".
        *   If Fail: Send Slack message back to Sales Rep detailing exactly which clauses are non-standard.
*   **Validation**: Validates the Document Processing and internal notification capabilities.
