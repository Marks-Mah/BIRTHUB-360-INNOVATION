# Policy: Workflow Template Updates

This policy defines the rules governing how updates to Workflow Templates published in the BirthHub360 Marketplace are handled relative to tenant installations.

## 1. Core Principle: Immutability of Installed Workflows
As defined in ADR-023, the overarching principle is that **BirthHub360 will never automatically modify a tenant's active workflow definition.**
Once a tenant installs a template, that workflow becomes a standalone, immutable copy owned by the tenant.

## 2. Notification Policy
When a new version of a template (e.g., from v1.0 to v1.1) is published to the Marketplace:

1.  **System Identification**: The system queries for all active `WorkflowDefinitions` that have metadata linking them to the updated `TemplateID`.
2.  **In-App Badging**: A visual "Update Available" badge is appended to the specific workflow in the tenant's Workflow Dashboard.
3.  **Admin Email**: An automated email is dispatched to all users with the `Tenant_Admin` role.
    *   **Content**: The email must include the Template Name, the old version, the new version, and the **Changelog** provided by the publisher.
    *   **Frequency**: Sent once upon publication. If the update is critical (e.g., a security patch), a follow-up reminder is sent 7 days later.

## 3. The Upgrade Mechanism
The platform provides a guided, manual upgrade path:

1.  **Side-by-Side Installation**: Clicking "Upgrade" in the UI will install the new template version as a brand new, *disabled* workflow (e.g., "Lead Triage (v1.1)").
2.  **Comparison View**: The UI provides a split-screen view, showing the old workflow and the newly installed workflow side-by-side, allowing the admin to manually port over any custom steps or variable mappings they had added to the old version.
3.  **Manual Cutover**: The admin is responsible for enabling the new workflow and subsequently disabling the old workflow to complete the cutover.

## 4. Forced Obsolescence (Security Exceptions)
While we do not auto-update *logic*, the platform reserves the right to forcefully disable workflows under extreme circumstances:

*   **Zero-Day Vulnerability**: If a specific template version is found to contain a critical security vulnerability (e.g., an inherent SSRF flaw in a hardcoded ActionStep), the platform operations team may mark that specific template version as `BLOCKED`.
*   **Behavior**: Any active workflow derived from a `BLOCKED` template will be forcefully disabled by the orchestrator. Incoming triggers will be rejected or sent to the DLQ until the tenant performs the manual upgrade path.
*   **Communication**: This action is accompanied by immediate, out-of-band communication (phone/email) to the tenant's technical contacts.
