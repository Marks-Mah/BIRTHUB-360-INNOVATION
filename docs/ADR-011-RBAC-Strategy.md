# ADR-011: Authorization Strategy (Flat RBAC vs. Hierarchical RBAC vs. ABAC)

## Status
Accepted

## Context
As the platform grows, we need a robust authorization model to determine what actions a user can perform. We must choose an approach that balances initial development speed, long-term maintainability, and the security needs of our target customers (B2B SaaS and Enterprise).

The primary options are:
1.  **Flat RBAC (Role-Based Access Control):** Users have explicit roles (Admin, User, Viewer). Permissions are assigned to roles. Roles do not inherit from one another.
2.  **Hierarchical RBAC:** Roles inherit permissions from lower roles (e.g., Admin inherits all User permissions).
3.  **ABAC (Attribute-Based Access Control):** Policies evaluate attributes of the user (role, department), the resource (owner, status, tag), and the environment (time, IP). "Can user X edit Deal Y if Deal Y belongs to user Z?"

## Decision
We will start with a **Flat RBAC** model as our foundation, with deliberate structural preparations to support **hybrid ABAC (Resource Ownership)** in specific critical domains later.

## Rationale
*   **Simplicity and Speed:** Flat RBAC is the easiest to implement, reason about, and audit. A simple matrix (Role x Resource x Action) maps directly to middleware guards.
*   **Predictability:** Hierarchical RBAC often leads to complex, entangled permission graphs where it's difficult to determine *why* a user has access to something. Flat RBAC requires explicit assignment, reducing accidental privilege grants.
*   **Overkill of Pure ABAC:** Implementing a pure, policy-engine-driven ABAC (like AWS IAM or OPA) from day one introduces immense complexity and performance overhead that our current product stage does not justify.
*   **The "Ownership" Caveat:** We recognize that in sales (SDRs/AEs), users often need to see *everyone's* deals (Read) but only edit *their own* deals (Update). To solve this, we will not build a full ABAC engine. Instead, we will handle "Resource Ownership" checks directly in the application logic (Services/Controllers) as an add-on to the RBAC base.

## Consequences
*   **Code Implementation:** We will implement middleware that strictly checks `user.roles.includes(REQUIRED_ROLE)`.
*   **No Inheritance:** If a new feature is added, permissions must be explicitly granted to all relevant roles. `Admin` does not automatically get access just because it's the "highest" role; it must be in the matrix.
*   **Business Logic Checks:** For actions requiring ownership validation (e.g., "Delete Deal"), the controller must first pass the RBAC check (`can:delete_deal`), fetch the resource, and then perform an imperative check (`if deal.ownerId !== user.id throw Forbidden`).
