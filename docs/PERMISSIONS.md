# Permissions Matrix (RBAC)

This document defines the exact permissions (Create, Read, Update, Delete - CRUD, and special actions) for every Role across all core Resources in the system.

## Roles Defined
*   **ADMIN**: System administrator with full access to settings, billing, and user management.
*   **SDR**: Sales Development Representative, focuses on lead qualification.
*   **AE**: Account Executive, focuses on closing deals and negotiating contracts.
*   **CS_MANAGER**: Customer Success Manager, focuses on post-sale health and retention.
*   **VIEWER**: Read-only access for auditing or cross-department visibility.

## Matrix

| Resource | Action | ADMIN | SDR | AE | CS_MANAGER | VIEWER | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Users** | Create | ✅ | ❌ | ❌ | ❌ | ❌ | |
| | Read | ✅ | ✅ | ✅ | ✅ | ❌ | Can only read names/emails of team members. |
| | Update | ✅ | ❌ | ❌ | ❌ | ❌ | Users can update their *own* profile. |
| | Delete | ✅ | ❌ | ❌ | ❌ | ❌ | |
| **Billing** | Read | ✅ | ❌ | ❌ | ❌ | ❌ | |
| | Update | ✅ | ❌ | ❌ | ❌ | ❌ | |
| **Leads** | Create | ✅ | ✅ | ✅ | ❌ | ❌ | |
| | Read | ✅ | ✅ | ✅ | ✅ | ✅ | |
| | Update | ✅ | ✅ | ✅ | ❌ | ❌ | |
| | Delete | ✅ | ❌ | ❌ | ❌ | ❌ | Soft delete only. |
| | Assign | ✅ | ✅ | ✅ | ❌ | ❌ | Can reassign leads. |
| **Deals** | Create | ✅ | ❌ | ✅ | ❌ | ❌ | |
| | Read | ✅ | ✅ | ✅ | ✅ | ✅ | |
| | Update | ✅ | ❌ | ✅ | ❌ | ❌ | |
| | Delete | ✅ | ❌ | ❌ | ❌ | ❌ | Soft delete only. |
| | Change Stage | ✅ | ❌ | ✅ | ❌ | ❌ | |
| **Contracts** | Create | ✅ | ❌ | ✅ | ❌ | ❌ | |
| | Read | ✅ | ❌ | ✅ | ✅ | ✅ | |
| | Update | ✅ | ❌ | ✅ | ❌ | ❌ | |
| | Delete | ✅ | ❌ | ❌ | ❌ | ❌ | |
| | Sign/Approve | ✅ | ❌ | ❌ | ❌ | ❌ | *Requires specific legal authority, handled outside standard AE role.* |
| **Customers** | Create | ✅ | ❌ | ❌ | ✅ | ❌ | Usually auto-created from won deals. |
| | Read | ✅ | ✅ | ✅ | ✅ | ✅ | |
| | Update | ✅ | ❌ | ❌ | ✅ | ❌ | |
| | Delete | ✅ | ❌ | ❌ | ❌ | ❌ | |

## Special Constraints
*   **Ownership Bias:** In a flat RBAC model, users with `Update` permissions on `Leads` or `Deals` can modify *any* lead/deal in the tenant. If strict ownership is required (e.g., AE can only edit *their* deals), this requires an ABAC (Attribute-Based Access Control) overlay on top of this RBAC matrix. Currently, we operate on a trust-based flat model within a single tenant.
