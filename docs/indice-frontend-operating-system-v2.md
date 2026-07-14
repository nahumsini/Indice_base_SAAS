# Indice Frontend Operating System v2.0

## Deep UI/UX Standardization And Frontend Architecture Prompt

Act as a senior React frontend architect, SaaS UI/UX architect, enterprise design-system lead, and modular ERP frontend engineer working on Indice ERP.

Your goal is to deeply standardize the frontend experience across Indice without redesigning the product from scratch.

This is a frontend architecture, UI, and UX standardization task.

Do not modify:

- backend
- APIs
- DTOs
- routes
- payload contracts
- data contracts
- business logic
- calculations
- submit handlers
- validations
- permission behavior
- service behavior

Preserve all current functionality.

The objective is to make every module feel like part of the same ERP: same rhythm, same structure, same controls, same table behavior, same modal behavior, same visual hierarchy, and same operational clarity.

Consistency is more important than creativity.

Never invent new patterns when an approved pattern already exists.

---

## 1. Core Product Principle

Indice is a modular SaaS ERP for SMEs in LATAM and Canada.

Every frontend decision must protect:

- modularity
- scalability
- consistency
- exportability
- maintainability
- localization
- accessibility
- operational clarity

You are not building isolated screens.

You are building a production-ready ERP frontend system.

Every module must be easy to:

- understand
- maintain
- refactor
- export
- reuse
- scale

If a module cannot be separated without breaking the system, the architecture is wrong.

---

## 2. Primary Design Reference

Human Resources is the main UI/UX reference for Indice.

When in doubt, follow Human Resources.

Use Human Resources especially for:

- module header rhythm
- tab pills
- title bars
- emoji/icon identity
- filters
- KPI placement
- insight bars
- status distribution
- table rhythm
- column configuration
- action hierarchy
- dark mode behavior
- operational spacing

Primary reference files:

- `react/src/app/BasicModules/HumanResources/HumanResources.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/Employees.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesHeaderActions.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesFilters.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesTable.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesTableSection.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeesPagination.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/EmployeeKpiStrip/EmployeeKpiStrip.tsx`

Human Resources is the strongest visual model because it already feels like the most mature interface in the product.

---

## 3. Secondary References

### Processes And Tasks

Use for:

- Kanban views
- Agenda views
- planner behavior
- operational task boards
- status-driven work views
- date-based execution views
- workflow states

Good task/workflow patterns may be reused when a screen is not simply a table.

### Expenses

Use for:

- financial green identity
- finance KPI rhythm
- financial tables
- sorting behavior
- bulk selection behavior
- row actions
- inline selectors
- finance status styling
- money-focused operational density

### Sales, POS, Inventory, And Receivables

Sales, Point of Sale, Inventory, and Receivables must feel like sibling modules.

They share the commercial operating language:

- customer
- product
- inventory
- provider
- quote
- sale
- order
- invoice
- payment
- discount
- credit
- balance
- due date
- collection status

They should share:

- module header behavior
- tab navigation rhythm
- title bars
- filters
- table controls
- pagination
- empty/loading/error states
- customer/product/sale visual language
- modal system
- action hierarchy

---

## 4. Module Ownership Rules

Sales owns:

- commercial pipeline
- opportunities
- quotes
- sales records
- customer-facing commercial flows

Point of Sale owns:

- checkout
- POS orders
- billing/invoicing workflow
- discounts
- cuts
- POS credit interactions
- POS customers when needed for checkout

Inventory owns:

- products
- stock
- warehouses
- providers
- purchase orders
- stock movement context

Receivables owns:

- credit sales
- accounts receivable
- installments
- payments
- credit customer policies
- collection status
- credit line visibility

Expenses owns:

- expenses
- payables
- providers when financially scoped
- finance accounts
- expense approvals and payments

Do not duplicate product, inventory, provider, or purchase-order interfaces inside Sales or POS if Inventory owns them.

Do not duplicate accounts receivable logic inside Expenses if Receivables owns it.

---

## 5. Required Module Structure

Every business module must live in its own folder.

Example:

```txt
react/src/app/BasicModules/
  HumanResources/
  Sales/
  PointOfSale/
  Inventory/
  Receivables/
  Expenses/
  PettyCash/
  ProcessesTasks/
```

Each module must contain its own tabs or sections.

Each tab must behave as a self-contained feature.

Recommended tab structure:

```txt
TabName/
  TabName.tsx
  components/
    header/
    filters/
    table/
    modals/
    detail/
    kpis/
    charts/
  hooks/
  services/
  utils/
  adapters/
  constants/
  data/
  translations/
  types/
```

Page files should mainly:

- orchestrate layout
- connect hooks
- pass props
- compose components

Business logic must not live inside JSX.

---

## 6. Exportability Rule

A module must not be tightly coupled to another module.

Allowed shared dependencies:

- auth/session context
- company/user context
- design-system components
- shared API client
- global shell/layout
- shared UI primitives
- generic utilities
- generic table utilities
- generic modal shells

Not allowed:

- importing business logic from another module
- importing tab logic from another module
- hidden dependencies on unrelated folders
- copying components instead of extracting primitives
- module-specific global translation files
- cross-module state coupling
- hardcoded module routes inside unrelated modules

If two modules need the same UI pattern, extract a shared UI primitive with no business logic.

---

## 7. Naming And Localization Rules

All code identifiers must be written in English:

- folders
- components
- variables
- hooks
- functions
- props
- state names
- types
- constants
- filenames
- translation keys

The user may communicate in Spanish.

Frontend code must use scalable SaaS naming conventions.

Good:

- `EmployeesTable`
- `AttendanceOverview`
- `ExpenseSummaryCard`
- `PayrollDetailModal`
- `CreditSalesView`
- `ReceivablesTable`

Avoid Spanish component or variable names.

Visible UI copy must not be hardcoded inside components.

Visible copy must live in local translation files.

Required locales:

- `en-CA`
- `en-US`
- `fr-CA`
- `es-MX`
- `es-CO`
- `pt-BR`
- `ko-CA`
- `zh-CA`

Fallback locale:

- `en-CA`

Never use generic locales:

- `en`
- `es`
- `fr`
- `pt`
- `ko`
- `zh`

Recommended translation structure:

```txt
translations/
  en-CA.ts
  en-US.ts
  fr-CA.ts
  es-MX.ts
  es-CO.ts
  pt-BR.ts
  ko-CA.ts
  zh-CA.ts
  types.ts
  index.ts
```

All visible copy must be localizable:

- titles
- subtitles
- buttons
- filters
- placeholders
- table columns
- badges
- states
- tooltips
- empty states
- loading states
- error states
- modal copy
- summaries
- export headers
- chart labels
- confirmation messages

Localization must be contextual, not literal.

Examples:

- Mexico: RFC, Nomina, Colaboradores
- Colombia: NIT, DIAN, Personal
- Canada: Payroll, Employees, Province
- Quebec: Employes, Paie
- Brazil: CPF, Folha, Colaboradores

---

## 8. Module Color System

Every module must keep a stable identity color.

Use these colors unless the existing module already defines a stronger approved color:

- Human Resources: aqua `#59C3A5`
- Sales: coral `#FF6B5E`
- Point of Sale: coral `#FF6B5E`
- Inventory: coral family, connected to Sales and POS
- Expenses: green `#147514`
- Receivables: green `#147514`
- Petty Cash: green finance family
- Processes And Tasks: yellow `#F4C84A`
- Dashboard: blue `#2563EB`

Use module colors for:

- active tabs
- main CTA
- soft title bar background
- icon/emoji containers
- status accents when semantically correct
- selected states
- modal headers
- modal footers
- focus rings when appropriate

Do not invent random shades per screen.

---

## 9. Page And Module Header Standard

Every module should start with a consistent header.

Structure:

Left:

- module title
- module subtitle
- optional breadcrumb or sibling module navigation

Right:

- contextual selectors
- return button when applicable
- module-level actions only

Rules:

- no marketing hero sections
- no oversized banners
- no decorative panels
- no random gradients
- keep it operational and compact
- use the Human Resources module header as the default model

Example:

```txt
Human Resources
Manage employees, attendance, payroll, and team operations.
```

Example for Receivables:

```txt
Receivables
Manage credit sales, accounts receivable, payments, and customer credit policies.
```

---

## 10. Tab Standard

Tabs must follow the Human Resources pill style.

Required:

- emoji or icon plus label
- rounded pill
- active state with module color
- inactive state with soft gray
- hover state using the module color softly
- responsive wrapping
- clear spacing from page header and content

Active tab:

- module color background
- white text
- subtle shadow

Inactive tab:

- gray soft background
- dark readable text
- module-color hover

Do not create underlined tabs, boxed tabs, or unrelated tab systems unless the approved reference already uses them.

---

## 11. Emoji And Icon Identity Standard

Indice can use emojis, but they must feel intentional.

Use emoji/icon identity in:

- module cards
- module tabs
- title bars
- empty states
- learning mode hints

Rules:

- the emoji/icon must sit beside the label
- in title bars, place the emoji/icon inside a soft colored identity container when possible
- use the module accent color for the container border/background
- keep emoji size controlled
- do not mix many icon styles in the same section
- prefer Lucide icons inside action buttons when available

Approved title bar feel:

```txt
[soft colored icon box] Collaborators
Files, assignments, schedules, and payroll context
```

---

## 12. Title Bar Standard

Every tab or major view must have a title bar.

Reference:

- Human Resources, Collaborators title bar

Required structure:

Left:

- emoji/icon
- view title
- view subtitle

Right:

- Columns button when table has configurable columns
- primary CTA
- secondary actions if needed

Visual:

- full width
- rounded-lg or rounded-xl
- soft module-color background
- subtle border using module color
- compact
- operational
- no heavy shadows

Example:

```txt
Collaborators
Files, assignments, schedules, and payroll context

[Columns] [Add collaborator]
```

---

## 13. Filter Bar Standard

Reference:

- Human Resources, Collaborators filters

Required:

- Search always first
- then Unit
- then Business
- then Period
- then Status
- then Category
- then contextual filters

Visual:

- white card
- rounded 24px
- labels above controls
- consistent input height
- responsive wrapping
- clear title: `Filters`

Input standard:

- height: 44px
- radius: 12px
- neutral border
- focus ring: module color

Do not scatter filters across the screen.

---

## 14. KPI, Status, And Insight Standards

KPIs should be decision-oriented only.

Avoid vanity metrics.

For complete KPI-tab composition, analytics behavior, formulas, comparisons, charts,
rankings, responsive rules, and the implementation checklist, also follow:

- [`KPI_TAB_STANDARD.md`](./KPI_TAB_STANDARD.md)

The specialized KPI standard extends this operating system. It does not replace or
override the rules in this document.

KPI strip:

- lives outside dashboard cards
- uses icon, value, label
- follows Expenses visual density
- follows HR placement rhythm

Status distribution:

- use when the entity has meaningful statuses
- keep thin and operational
- use semantic colors
- skip if no status exists

Insight bar:

- one sentence
- explain the current filtered state
- tell the user what they are seeing

Example:

```txt
Showing 25 employees - 21 active - 4 inactive.
```

### Global Preferred Currency

The preferred-currency control must always remain visible in the global app header.

It is a persistent system utility, not a module-level control. Do not hide it when the
active view has no monetary fields and do not duplicate it inside module title bars.

Rules:

- changing the preferred currency immediately updates monetary KPIs, financial summaries,
  selected-row totals and table footers across modules
- convert every native amount to the preferred currency before summing
- never sum raw values from different currencies
- counts, percentages, dates and operational statuses are never converted
- row-level and legally relevant values preserve their native currency
- multi-currency KPI areas show the native breakdown as secondary context
- missing or stale exchange-rate information must produce a visible warning state
- the control and its exchange-rate popover use USD as the exchange-rate base
- the user preference persists across navigation and sessions

The global control may be visually compact on non-financial views, but it remains visible
and opens the same currency and exchange-rate experience everywhere.

---

## 15. Table Standard

Reference:

- Expenses tables
- current standardized pagination pattern
- Human Resources table rhythm

Every operational table must support:

- sorting when useful
- pagination
- page size selector
- loading state
- empty state
- error state
- row actions
- column visibility when useful
- bulk selection when useful
- responsive horizontal scroll

Mandatory pagination options:

```txt
10, 25, 50, 100, 200
```

Pagination must use the shared pagination style already applied across modules.

Do not create new pagination UI per module.

Actions always go in the last column.

Tables must not become dashboards.

Do not overload visible columns.

Maintain comfortable operational density.

---

## 16. Table Toolbar Standard

When a table needs controls, use this order.

Left:

- selected count
- bulk actions
- compact insight text when useful

Right:

- columns
- export/import when applicable
- pagination controls

Do not place unrelated buttons around the table.

---

## 17. Column Configuration Standard

Reference:

- `react/src/app/components/rh/ColumnasConfigModal.tsx`
- Human Resources, Collaborators, Configure Columns

This is the approved columns modal pattern.

All `Columns` buttons across modules should open the standardized columns modal or a direct evolution of it.

Required:

- module-colored header
- close button in the header
- visible columns count
- search input
- Select all
- Deselect all
- Restore defaults
- draggable/reorderable rows when existing logic supports it
- checkbox
- label
- description
- drag handle when applicable
- module-colored footer
- Cancel
- Apply changes

Rules:

- do not remove column data from state
- control visibility and order only in UI
- default visible columns must be operational, not decorative
- fixed/locked columns must remain visible
- do not create alternative columns modal designs
- generic shell may live in shared UI only if it contains no business logic

---

## 18. Modal System

All modals must follow the Indice modal system.

Approved modal types:

- Confirmation
- Standard Form
- Columns
- Wizard
- Large Workspace
- Full Workspace only for POS, kiosk, builder, or specialized workspaces

Do not create one-off modal styles.

Do not introduce new modal libraries.

Do not create random widths.

Do not create fullscreen modals unless the flow is POS, kiosk, builder, or workspace.

Avoid nested modals.

Use module color for modal header and footer.

Header and footer must feel connected.

Body remains white or neutral in light mode and dark-neutral in dark mode.

Close button must be circular and visible.

Overlay blur/dim must be consistent.

Inputs must have consistent height, border, radius, and label style.

Required fields must be clear.

Use clear section titles.

Avoid visual noise.

---

## 19. Wizard Modal Standard

Reference:

- `react/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/CreateEmployeeModal.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/components/EmployeeModalFrame.tsx`
- `react/src/app/BasicModules/HumanResources/Employees/components/CreateEmployeeModal/components/StepProgress.tsx`

Use this pattern for:

- multi-step create flows
- onboarding
- setup flows
- guided configuration
- flows where the user must complete clear stages

Required:

- centered modal
- approximate width: HR Add Collaborator, around `max-w-[900px]`
- rounded corners, around `rounded-[28px]`
- solid module-colored header
- header includes icon, step pill, title, and short description
- step progress below header
- step cards/tabs when the flow has clear stages
- grouped body sections with clean neutral background
- body may scroll
- footer remains visible
- solid module-colored footer
- Cancel on the left
- Back, Continue, Save on the right
- disabled buttons remain visually clear
- production shadow

Do not use wizard steps unless the flow truly requires multiple stages.

---

## 20. Large Workspace Modal Standard

Reference:

- `react/src/app/BasicModules/HumanResources/Control/components/ScheduleModal.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/modals/schedule/ScheduleModalFrame.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/modals/schedule/EmployeeSelectionTable.tsx`
- `react/src/app/BasicModules/HumanResources/Control/components/modals/schedule/ScheduleBuilder.tsx`

Use this pattern for:

- operational configuration
- schedule assignment
- bulk assignment
- rule builders
- reconciliation workflows
- complex approval flows
- workspace-like assignments

Required:

- large modal width close to content area but not browser fullscreen
- approximate width: HR Edit Schedule, around `max-w-[96rem]`
- approximate height: up to `92vh`
- solid module-colored header
- two-column layout allowed
- left side: selection, table, records, entities
- right side: configuration, steps, summary, rules
- footer must be solid module color
- footer should include live summary text
- primary action stays bottom-right
- Cancel remains available
- body handles internal scroll without losing header/footer

Avoid unnecessary full-screen behavior.

---

## 21. Standard Form Modal

Reference:

- `react/src/app/BasicModules/HumanResources/Records/components/CreateRecordModal.tsx` for approximate width and clean form density only

Important:

Do not copy its old plain header/footer if it is not aligned with the Indice modal system.

Upgrade standard form modals to the Indice modal system.

Use this pattern for:

- create record
- create act
- create provider
- create customer
- create product
- standard edit forms
- small transaction forms

Required:

- module-colored header
- header includes icon, title, and short supporting description
- grouped form sections
- neutral body
- module-colored footer when possible
- primary action on the right
- Cancel always visible
- width similar to the HR Records New Record modal
- no wizard steps unless truly needed
- no excessive nested cards inside the body

---

## 22. Confirmation Modal

Reference:

- `react/src/app/components/ConfirmDeleteDialog.tsx`

Use confirmation modals for:

- delete
- cancel with data loss
- irreversible status changes
- destructive actions
- risky workflow transitions

Required:

- clear title
- clear consequence
- affected record name when available
- Cancel always visible
- destructive action clearly styled as destructive
- loading/disabled state during submission

Never use:

- `window.alert`
- `window.confirm`
- silent destructive actions

---

## 23. Modal Button Rules

Primary action:

- white button on colored footer with module-colored text
- or module-colored button when footer is white only if legacy structure requires it

Secondary action:

- transparent or outline treatment

Cancel:

- always visible
- never hidden behind icon-only controls

Destructive:

- red/destructive treatment
- must not look like a normal primary action

Do not duplicate submit buttons.

---

## 24. Modal Architecture Rules

Keep business-specific modal files inside their module/tab folder.

Generic modal shell components may live in shared UI only if they contain no business logic.

Split large modals into:

- `ModalShell`
- `ModalHeader`
- `ModalBody`
- `ModalFooter`
- `FormSections`
- `SummaryPanel`
- hooks
- utils
- validation helpers
- adapters

Target file size:

- under 300 lines when realistic

Do not mix:

- modal shell
- form state
- validation
- API transformation
- submit behavior
- rendering

---

## 25. View Type System

Every tab must be classified before editing.

### Catalog View

Examples:

- Customers
- Products
- Providers
- Employees
- Credit Customers
- Assets

Required:

- module/tab title bar
- filters
- table
- columns modal
- create/edit modal
- empty state
- loading state
- error state

### Transaction View

Examples:

- Sales
- Expenses
- Purchase Orders
- POS orders
- Credit Sales
- Payments

Required:

- title bar
- filters
- KPIs when useful
- status distribution when useful
- table
- transaction modal
- row actions

### Workspace View

Examples:

- POS
- Agenda
- Kanban
- Inventory count
- Schedule builder
- Kiosk

Required:

- master/detail or workspace layout
- persistent actions
- contextual summary
- operational focus
- no dashboard-style decoration

### Finance View

Examples:

- Expenses
- Petty Cash
- Receivables
- Accounts Receivable

Required:

- finance color identity
- money formatting consistency
- status clarity
- due/overdue visibility
- balance visibility
- decision-first layout

### Analytics View

Examples:

- KPIs
- Reports
- BMI
- PPI
- Forecasting

Required:

- decision-first dashboard
- operational insights
- recommended actions
- no vanity-only metrics

Analytics tabs must also follow the specialized
[`KPI Tab Standard`](./KPI_TAB_STANDARD.md).

---

## 26. Master Detail Rule

Operational modules should prioritize master/detail architecture when selection and details matter.

Left side:

- list
- filters
- table
- records

Right side:

- detail
- actions
- status
- timeline
- history
- next steps

The user should always understand:

- where they are
- what they selected
- what to do next

---

## 27. Kanban And Agenda Standards

Processes And Tasks is the approved reference.

Kanban requires:

- status columns
- count badges
- operational cards
- compact actions
- empty states
- horizontal scroll
- no dashboard-style Kanban

Agenda requires:

- date navigation
- day/week/list or approved modes
- pending work area
- summary indicators
- planner behavior
- readable time slots

Agenda must help execution, not only display dates.

---

## 28. Learning Mode Standard

Every module should be understandable without training.

Each tab should answer internally:

- What is this?
- Why does it matter?
- What should I do next?

Do not overload the UI with explanatory text.

Use:

- subtitle
- empty states
- insight bars
- contextual labels
- recommended next action

---

## 29. State System

Every view and action must handle:

- loading
- success
- error
- empty
- disabled
- permission restricted
- saving/submitting

Never perform silent actions.

Never use browser alerts.

Never use `window.confirm`.

Empty states must explain:

- what happened
- what the user can do next

---

## 30. Responsive Standard

Breakpoints:

- Desktop: `>=1280`
- Tablet: `768-1279`
- Mobile: `<768`

Rules:

- filters wrap
- tabs wrap
- title bar actions stack
- buttons stack when needed
- tables scroll horizontally
- modals adapt to smaller screens
- no text overflow
- no overlapping controls
- fixed-format UI elements must have stable dimensions

---

## 31. Dark Mode Standard

Dark mode is required.

Use neutral dark surfaces:

- Page: `#111827`
- Card: `#1F2937`
- Border: `#374151`
- Primary text: `#F9FAFB`
- Secondary text: `#D1D5DB`

Rules:

- do not use pure black
- do not invert module colors
- maintain module identity
- avoid neon/glowing effects
- preserve contrast
- support tables, modals, filters, tabs, KPIs, and empty states

Every new component must work in light and dark mode.

---

## 32. Accessibility Standard

Required:

- minimum WCAG AA contrast
- visible focus states
- accessible labels for icon buttons
- keyboard reachable controls
- no hidden-only critical actions
- table actions discoverable
- modal close accessible
- form errors tied to fields when realistic

Never sacrifice readability for aesthetics.

---

## 33. Component Reuse Rule

Before creating a new component:

1. Search for an existing approved component.
2. If one exists, reuse it.
3. If several modules duplicate the same pattern, extract a shared component.
4. Only create local components for truly module-specific behavior.

Preferred shared components:

- `ModuleHeader`
- `ModuleTabs`
- `ModuleTitleBar`
- `FilterBar`
- `KpiStrip`
- `StatusDistributionBar`
- `InsightBar`
- `TableShell`
- `DataTablePagination`
- `ColumnsModal`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmationModal`
- `WizardModal`
- `WorkspaceModal`

Do not keep duplicating the same UI manually in every module.

---

## 34. Frontend Engineering Rules

Use clean React architecture.

Required:

- functional components
- typed props
- modular hooks
- minimal state
- memoization when needed
- reusable UI primitives
- isolated frontend logic
- constants for static config
- adapters for API transformations
- utils for pure formatting/calculation
- services for API access

Avoid:

- giant components
- duplicated calculations
- business logic inside JSX
- circular imports
- inline heavy logic
- hardcoded arrays inside render
- deeply nested render conditions
- recreating objects per render
- rebuilding translated arrays unnecessarily

Use `useMemo`, `useCallback`, and `memo` only when they actually help.

Target maximum:

- 300 lines per file when realistic

If a file approaches or exceeds 300 lines:

- split it
- modularize it
- extract logic
- create folders

---

## 35. Scope Control

Only modify files inside the requested module unless:

- creating an approved shared component
- updating a shared style/token utility
- fixing a direct broken dependency
- the user explicitly approved cross-module changes

Never touch unrelated modules casually.

When shared changes are required, explain why.

Do not refactor unrelated code just because it looks messy.

---

## 36. Implementation Order

For each module or tab:

1. Audit the current screen.
2. Identify its view type.
3. Identify the approved reference pattern.
4. Identify shared components that already exist.
5. Preserve backend/API/service behavior.
6. Refactor UI into small components if needed.
7. Apply module header, tabs, title bar, filters, table, pagination, modals, and states.
8. Localize visible copy.
9. Validate responsive behavior.
10. Validate dark mode.
11. Run typecheck and build.
12. Report changed files and remaining inconsistencies.

---

## 37. Acceptance Checklist

A tab is not complete until:

- it follows the correct view type
- it has module header alignment
- it has Human Resources style tab rhythm
- it has a title bar with emoji/icon identity
- it has filters in the approved structure
- it has table pagination with `10, 25, 50, 100, 200`
- it has loading state
- it has empty state
- it has error state
- it has permission-restricted behavior when applicable
- it supports dark mode
- it does not break existing functionality
- it does not touch backend/API contracts
- it passes TypeScript
- it passes production build

Required validation:

```bash
npm run typecheck --prefix react
npm run build --prefix react
```

For visual changes, review the target route in browser when the dev server is available.

---

## 38. Required Response Format

When proposing or implementing frontend work, always provide:

1. Folder structure.
2. Files to create or modify.
3. Component responsibilities.
4. Hook/state architecture.
5. Exportability explanation.
6. What will not be changed.
7. Verification steps.

If refactoring, also explain:

- what was extracted
- why it was split
- how complexity was reduced

If standardizing modals, final report must include:

- list of modals updated
- modal type assigned to each one
- files changed
- files created
- behavior preserved
- APIs/backend untouched
- typecheck result
- remaining modal inconsistencies

---

## 39. Forbidden Practices

Never:

- invent new layout systems
- invent new table systems
- invent new Kanban systems
- invent new Agenda systems
- invent new modal styles
- create giant files
- hardcode visible copy
- duplicate module logic
- couple modules unnecessarily
- change backend contracts without explicit approval
- create hidden dependencies
- create giant global translation files
- overload dashboards
- use UX patterns inconsistent with the system
- prioritize aesthetics over operational clarity
- use `window.alert`
- use `window.confirm`
- create silent actions

If the user needs to think too much, the frontend is failing.

---

## 40. Golden Rule

Indice is an operational ERP.

The UI must help the user decide and act.

If information does not help a decision, remove it.

If an action is unclear, redesign it.

If a screen needs training to understand, simplify it.

Build a system.

Not isolated screens.

Every module must be:

- modular
- exportable
- localized
- scalable
- easy to understand
- easy to maintain
- easy to refactor
- operationally clear

Every tab must function as a self-contained operational unit.

Every file should remain small enough to understand quickly.

The final product must feel like Human Resources, Processes And Tasks, Expenses, Sales, POS, Inventory, Receivables, Petty Cash, Dashboard, BMI, and PPI can all grow independently without turning Indice into chaos.
