# Indice MCP Operating System V1

Status: canonical

Applies to: `integrations/indice-mcp`, `/api/v1/ai/**`, OAuth connections and every Indice tool exposed to an AI client.

## 1. Purpose

The Indice MCP is a delegated business interface, not a database gateway and not a second business
application. It lets an authenticated person ask business questions and execute a small set of
bounded actions through the existing Indice domain owners.

The trust path is:

```text
ChatGPT or another MCP client
  -> OAuth-protected Streamable HTTP MCP
  -> /api/v1/ai/tools/**
  -> existing Indice domain services
  -> tenant-scoped persistence
```

The MCP process never reads or writes MySQL directly. Domain services remain authoritative for
money, inventory, tasks, status transitions, organizational scope and audit.

## 2. Authorization invariant

An OAuth scope is necessary but never sufficient. Every tool invocation must revalidate, in the
backend and using the current database state:

1. token validity, expiry and revocation;
2. active direct user-company membership;
3. active company and subscription access;
4. company module entitlement;
5. current user module assignment;
6. the exact tab permission required by the owner route;
7. commercial capability when the product enforces one;
8. unit, business, user and object ownership where the domain requires them.

The client cannot provide company, membership, role, entitlement or organizational authority.
Privileged roles do not remove tenant boundaries and do not make an unavailable company module
available.

Connection creation without an explicit scope selection grants the read scopes only. Action scopes
must always be selected explicitly. Existing stored connections keep exactly their stored scopes;
deployments never add new scopes to them.

## 3. Current tool authorization matrix

The table describes all 28 MCP tools. `Any(...)` means at least one current tab grant is required.
Every row also inherits the common invariant above.

| Tool | OAuth scope | Owner module and tab permission | Risk and additional rule |
| --- | --- | --- | --- |
| `get_sales_today` | `sales.today:read` | `crm`; `crm.kpis` | Read; current organizational KPI scope |
| `get_business_snapshot` | `business.snapshot:read` | `kpis`; `kpis.kpis` | Read; backend-calculated executive aggregates |
| `get_attention_items` | `business.snapshot:read` | `kpis`; `kpis.kpis` | Read; derived from the authorized snapshot |
| `search_employees` | `hr.people:read` | `human_resources`; `human_resources.collaborators` | Read; HR service scope and redaction |
| `get_employee_overview` | `hr.people:read` | `human_resources`; `human_resources.collaborators` | Read; embedded tasks/attendance appear only when separately permitted |
| `get_attendance_exceptions` | `hr.attendance:read` | `human_resources`; `human_resources.attendance` | Read; no biometric, photo or coordinate data |
| `list_tasks` | `tasks.read` | `processes`; Any(`calendar`, `projects`, `processes`, `kpis`) | Read; task visibility remains user scoped |
| `get_task_detail` | `tasks.read` | `processes`; Any(`calendar`, `projects`, `processes`, `kpis`) | Read; object must be present in the actor's visible task set |
| `get_sales_summary` | `sales.read` | Commercial: `crm.sales`; POS: Any(`pos.sale`, `pos.kpis`) | Read; includes only the channels currently allowed to the actor |
| `list_sales` | `sales.read` | Commercial: `crm.sales`; POS: Any(`pos.sale`, `pos.kpis`) | Read; includes only the channels currently allowed to the actor |
| `get_sale_detail` | `sales.read` | Source-specific: `crm.sales` or Any(`pos.sale`, `pos.kpis`) | Read; source permission is checked before lookup |
| `get_cash_status` | `pos.read` | `pos`; Any(`pos.cortes`, `pos.kpis`) | Read; POS organizational context required |
| `search_products` | `inventory.read` | Inventory: Any(`products`, `inventory`, `purchase-orders`); or CRM: Any(`quotes`, `sales`) | Read; catalog fields only |
| `get_product_detail` | `inventory.read` | Same catalog rule as `search_products` | Read; stock balances additionally require `inventory.inventory` |
| `get_inventory_summary` | `inventory.read` | `inventory`; `inventory.inventory` | Read; authoritative inventory domain only |
| `get_expense_summary` | `expenses.read` | `expenses`; Any(`expenses`, `kpis`) | Read; FinanceContext organizational scope |
| `list_expenses` | `expenses.read` | `expenses`; Any(`expenses`, `kpis`) | Read; FinanceContext organizational scope |
| `get_expense_detail` | `expenses.read` | `expenses`; Any(`expenses`, `kpis`) | Read; company and scope-owned expense only |
| `get_funds_status` | `petty_cash.read` | `petty_cash`; Any(`cash`, `control`, `statements`, `kpis`) | Read; kiosk credentials and tokens are excluded |
| `get_receivables_status` | `receivables.read` | `receivables`; Any(`credit-sales`, `accounts-receivable`, `payments`, `credit-customers`) | Read; FinanceContext organizational scope |
| `preview_create_task` | `tasks.create` | `processes`; Any(`calendar`, `projects`, `processes`) | Preparation; persists only confirmation and audit |
| `create_task` | `tasks.create` | `processes`; Any(`calendar`, `projects`, `processes`) | Confirmed action; assignment limited to connected user |
| `preview_create_expense_draft` | `expenses.create` | `expenses`; `expenses.expenses` | Preparation; no payment or approval |
| `create_expense_draft` | `expenses.create` | `expenses`; `expenses.expenses` | Confirmed action; creates `DRAFT` only |
| `preview_register_fund_expense` | `petty_cash.expense:create` | `petty_cash`; `petty_cash.control` | Preparation; no global expense authorization |
| `register_fund_expense` | `petty_cash.expense:create` | `petty_cash`; `petty_cash.control` | Confirmed balance-impacting action |
| `preview_add_money_to_fund` | `petty_cash.deposit:create` | `petty_cash`; `petty_cash.control` | Preparation; exact source account required |
| `add_money_to_fund` | `petty_cash.deposit:create` | `petty_cash`; `petty_cash.control` | Confirmed Treasury-impacting action |

Module and tab names in this matrix refer to canonical keys such as
`inventory.inventory` and `expenses.expenses`. Capability checks remain `sales`, `inventory`, `pos`,
`expenses`, `petty_cash`, `receivables`, `processes` or `kpis` as classified by the owning route.

## 4. Action protocol

Every action uses an immutable two-step protocol:

1. a preview validates and normalizes the complete business request;
2. the backend stores a hashed, connection-bound confirmation with a maximum five-minute lifetime;
3. the user explicitly approves the displayed preview;
4. commit accepts only the confirmation token and an idempotency key;
5. one transaction consumes the confirmation, executes the owner service and records the result;
6. an identical retry returns the original result; a conflicting retry fails closed.

Commit must never accept replacement business fields. Confirmations are bound to the exact token,
tool, user, company and membership. Money or balance actions must be audited with a safe correlation
identifier and use the Finance/Treasury owner contract.

## 5. Data minimization and result contracts

Tools expose business answers, not database rows. Stable tool outputs require explicit DTOs and
schemas. Generic maps are a compatibility boundary for the current V1 and must be replaced
incrementally; no new stable tool may introduce another untyped `Map<String, Object>` or
`Record<string, unknown>` result without an approved dynamic-data reason.

Responses must:

- use canonical English field names and localized human summaries;
- separate authoritative totals from paged items;
- disclose `returnedCount`, `totalCount`, `hasMore` and an opaque cursor when a list is bounded;
- compute totals in the backend over the complete authorized filter, never over a truncated page;
- redact credentials, tokens, object keys, private URLs, biometrics, precise coordinates, payroll,
  national identifiers and unrelated personal data;
- use stable machine-readable errors without backend bodies, SQL messages or stack traces.

## 6. Tool discovery and conversational design

Tool names describe business intent, not CRUD. Inputs should prefer names, dates, folios and
business concepts. When an owner action ultimately needs an identifier, a read-only resolver must
let the model identify the exact authorized entity first and must return enough label/context for
human confirmation.

The next read-only resolver package is:

- `get_my_business_context`;
- `search_customers`;
- `search_providers`;
- `list_payment_accounts`;
- `list_funds`;
- `list_units_and_businesses`;
- `list_warehouses`;
- `search_budget_lines`;
- `search_accounting_accounts`.

Delegated HTTP discovery is capability-aware. On every MCP request, the server obtains the `v1`
manifest from `GET /api/v1/ai/access/capabilities`, validates it against its closed tool catalog and
enables only tools compatible with both the stored OAuth scopes and current Indice permissions.
The manifest is returned with `Cache-Control: no-store`; permission revocation therefore affects the
next request. Tool execution still repeats its owner authorization and never trusts discovery as an
enforcement boundary.

The local stdio development transport may register the complete catalog because it has no delegated
HTTP request context. It does not weaken backend authorization and is not the production ChatGPT
connection path.

## 7. Operations and public release

The MCP remains bound to loopback. A public deployment exposes only the exact HTTPS MCP route
through the reverse proxy and preserves the Authorization header. The public route requires a
bounded JSON body, rate limiting and no-store responses. Readiness must distinguish MCP process
liveness from backend authorization-service availability.

Production/catalog release requires all of the following:

- successful OAuth Authorization Code + PKCE, refresh and revocation from the real ChatGPT flow;
- tool discovery/annotation scan;
- negative multi-tenant, wrong-module, wrong-tab and wrong-organizational-scope tests;
- confirmed-action and idempotent-retry tests using synthetic APPTEST data;
- safe metrics for tool, latency, outcome and correlation without logging raw secrets or payloads;
- approved domain verification, privacy, terms and isolated reviewer account;
- documented rollback with the previous immutable images retained.

## 8. Change and verification discipline

Adding or changing a tool requires, in the same change:

1. one matrix entry and named domain owner;
2. an explicit input/output schema;
3. OAuth scope and exact module/tab policy;
4. tenant and narrower-scope negative tests;
5. redaction and error-contract tests;
6. action confirmation, idempotency, transaction and audit coverage when applicable;
7. TypeScript MCP tests, focused backend tests and relevant compilation;
8. APPTEST conversational evaluation before public enablement.

No high-risk action such as paying an expense, approving money, adjusting inventory, cancelling a
sale, changing permissions, running payroll or deleting business records may be added without a
separate approved domain decision and recovery tests.

## 9. Known bounded V1 debt

- generic business and finance result schemas remain dynamic;
- list tools have limits but no cursor contract and several queries filter in memory;
- the public MCP route has no repository-defined dedicated rate-limit policy;
- Docker health proves anonymous protection/liveness but not backend readiness;
- the full ChatGPT APPTEST and reviewer checklist remains incomplete;
- `docs/indice-mcp-local-mvp.md` is historical and its migration/test counts must not be used as
  current release evidence.

These items define the next MCP foundation blocks. They do not authorize additional write actions.
