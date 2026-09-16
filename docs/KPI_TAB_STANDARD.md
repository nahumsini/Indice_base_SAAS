# Indice KPI Tab Standard

## Specialized Extension Of The Frontend Operating System

This document defines the approved structure for KPI, Indicators, Reports,
Forecasting, BMI, PPI, and other analytics tabs in Indice.

It extends the [Indice Frontend Operating System v2.0](./indice-frontend-operating-system-v2.md).
When implementing an analytics tab, both documents must be consulted.

If the documents appear to conflict, the Frontend Operating System is authoritative.
This document adds analytics-specific rules and must not be treated as a separate
design system.

Presentation decision, 2026-09-15: the approved Human Resources internal-view
layout is the required reference for new or reorganized KPI / Indicators tabs
in basic modules. It is implemented in Human Resources; adoption and verification
in other modules remain pending. This approval covers information organization,
not validation or replacement of a module's existing calculations.

---

## 1. Purpose

An Indice KPI tab must help the user:

- understand the current state
- compare it with a useful reference
- identify risk or opportunity
- discover the cause
- move from insight to action

A KPI tab is not a decorative dashboard.

Every number, chart, ranking, and status must answer a business question.

Avoid:

- vanity metrics
- charts without a decision purpose
- duplicated information
- unexplained scores
- values without a comparison or target
- totals produced by mixing currencies
- analytics that cannot lead to record-level detail

---

## 2. How To Use This Standard

Before creating or changing a KPI tab:

1. Read the Frontend Operating System.
2. Identify the module's business decisions.
3. Define the eight KPI contracts before building the cards.
4. Define the global filter scope.
5. Map the existing content to the internal views in Section 3 before adding panels.
6. Select charts that answer different questions and define the contextual ranking entity.
7. Document formulas and thresholds.
8. Implement loading, empty, error, permission, and responsive states.
9. Validate TypeScript and the production build.

The layout is reusable. The business metrics are module-specific.

Do not copy financial formulas into Human Resources, Sales, Inventory, or another
module merely to preserve visual similarity.

---

## 3. Required Information Architecture

### 3.1 Shared shell and internal views

For basic-module KPI / Indicators tabs, use this shared shell:

1. Compact title bar with the global refresh and print/export actions.
2. Internal view selector.
3. One shared filter bar.
4. Compact data context and source warnings when relevant.
5. The selected view's content.

Distribute the existing analytical content across the following view roles.
Do not stack every role below the cards on the initial screen.

| View role | Default label | Content | Decision supported |
|---|---|---|---|
| `overview` | Resumen | Primary KPI cards, executive insight and supporting totals | What is the current state? |
| `charts` | Gráficas | Composition, distribution, trends and module-specific analysis | What explains the result? |
| `units` | Por unidad | Organizational comparison chart, relevant rankings and summary table | Where is attention needed? |
| Domain-specific detail | Colaboradores in RH; use the owning module's entity elsewhere | Paginated record/entity table, supporting detail and attention cases | Which records require action? |

Use these four roles as the default mapping. Localize labels and adapt the detail
entity to the module; do not copy `employees` into financial or inventory views.
If the module has no meaningful organizational comparison, document a useful
substitute or omit that view. Do not invent data, rankings or empty tabs to fill
the layout. Add another view only for a distinct decision that cannot fit clearly
within this mapping, and document the reason in the module contract.

The user journey must read from summary to cause across views:

```txt
Scope -> Current state -> Comparison -> Cause -> Responsible entity -> Action
```

Open on `overview` for a new workspace. A valid explicit URL or remembered view
may restore a deeper context. The shared filters and relevant data-state messages
remain available in every view. Primary cards live in Overview; do not repeat
the eight-card grid above each view.

Each chart, ranking and table has one primary location. Consolidate duplicated
attention summaries and detailed lists with disclosure, preserving their reasons,
record access and filter actions. Keep full tables in the appropriate detail or
comparison view, rather than on the initial summary.

### 3.2 Visual and navigation parameters

Required presentation parameters:

| Parameter | Standard |
|---|---|
| Navigation engine | `IndiceWorkspaceNavigation`, `variant="views"` |
| Visual reference | Grouped Table / Kanban / Agenda selector from Processes and Tasks |
| Module identity | Pass the owning module's `tone`; RH uses aqua, other modules use their approved color |
| Selector | Neutral bordered surface, rounded rectangular buttons, icon plus localized label, active module color |
| Outer layout | `grid min-w-0 grid-cols-1 gap-6` |
| Vertical spacing | 24 px between title and selector, and the same 24 px between selector and filters |
| Alignment | Title, selector and filters share the same left edge; the selector can fit its content |
| View state | Existing `useWorkspaceNavigationMemory`, with a declared URL field; `view` is the default query key |
| Initial/fallback view | `overview`; unsupported or unavailable restored values resolve to an allowed view |

Let the parent gap control spacing. Neutralize title-bar bottom margins with
`className="mb-0"` when the title wrapper supplies one. Do not combine sibling
margin utilities with overrides that remove the title-to-selector gap or double
the selector-to-filter gap. Keep the two gaps equal on mobile as well.

Use the shared engine's keyboard navigation, selected-state semantics and focus
treatment. On narrow screens, the buttons wrap without clipping labels or forcing
horizontal page scrolling. Keep dark mode and the module's accessible active text
color. Analytics identity alone is not a reason to replace the module tone with blue.

Changing the view changes presentation, not the data scope. Preserve filters,
dependent organizational selections and each table's page while moving between
views; a filter change still resets pagination according to the table contract.
Keep the active view in the existing company/user-scoped workspace memory. Do not
create a separate local-storage or navigation engine per module.

Render only the active view visibly. Do not mount responsive charts into hidden,
zero-width containers. Tables may retain their mounted state while hidden, or
keep their state in the owning workspace, to preserve pagination. Changing view
must not itself refetch the same dashboard data or generate a loading overlay.

Refresh acts on the shared data. Print/export retains the module's existing
scope; a complete report must not silently shrink to the visible tab or table
page. If a module already supports a view-specific report, retain its explicit
label and scope. Source failures remain visible when switching views.

### 3.3 Human Resources reference mapping (approved 2026-09-15)

Human Resources distributes its existing analytics across four internal views
to reduce simultaneous information density:

- `overview` (Resumen): the eight existing KPI cards, executive signal and
  supporting totals.
- `charts` (Gráficas): attendance, permission and record distributions.
- `units` (Por unidad): unit performance chart, unit/department rankings and
  the operational unit summary table.
- `employees` (Colaboradores): employee operations table and a collapsible
  attention queue. The queue replaces the duplicate short attention ranking;
  it retains each case's signals and focus action, showing five cases initially
  and allowing expansion to all cases supplied by the existing calculation.

Place `IndiceWorkspaceNavigation` with `variant="views"` and `tone="aqua"`
between the title bar and the single shared filter bar. Only the active view's
content is visible. Preserve filters across view changes; remember the active
view through the existing workspace memory and `view` URL parameter, falling
back to `overview` for unsupported values. Retain employee table pagination when
switching views. Source warnings remain visible above the selected content.

Refresh and print stay global. Printing continues to generate the complete
filtered report, independently of the selected view. This presentation change
does not change the current KPI formulas, thresholds, data sources, totals or
permission contracts, and does not add the indicators from earlier proposals.

### 3.4 Adoption boundaries

This is a presentation standard for analytical tabs inside basic modules. It does
not replace the parent module navigation, ordinary operational-list KPI strips,
or specialized executive-analysis workflows with their own approved contracts.

Adopt it module by module. Inventory the current panels and interactions, map
each to one view, preserve business calculations and permission boundaries, then
verify the result. This document does not authorize adding missing business
metrics, changing APIs, modifying schemas or rewriting score formulas as part of
a visual migration. Existing data-quality defects remain separate tracked work;
visual approval must not be described as certification of those values.

The implementation reference is Human Resources. Other modules are candidates
for migration, not already standardized or verified by this documentation change.

---

## 4. Title Bar

The KPI tab uses the same title-bar contract as every other Indice tab.

Left:

- module-approved emoji or icon
- localized tab title
- one-sentence operational subtitle

Right:

- export or print action when useful
- secondary actions only when they belong to the whole analytics view

Rules:

- use the module identity color
- keep the bar compact
- do not create a marketing hero
- do not duplicate the global preferred-currency selector
- do not place chart-specific actions in the title bar
- apply the action-count and overflow hierarchy from Section 12 of the Frontend Operating System:
  show one to three eligible actions directly, and only when there are four or more use a fourth
  `Actions` control for overflow
- if the analytics view owns a configurable contextual table, keep `Columns` direct while the
  complete action set has three or fewer actions; whenever overflow exists, place `Columns` inside
  that menu and do not duplicate it

Example:

```txt
Indicators
Integrated view of spending, budget, and financial performance.

[Print report]
```

---

## 5. Global Filter Bar

All KPI cards, charts, rankings, tables, totals, and exported reports must respond to
the same global scope.

Approved order:

1. Search.
2. Unit.
3. Business.
4. Period.
5. Status.
6. Category.
7. Module-specific filters.

The exact filters may vary, but their order must remain predictable.

Examples of contextual filters:

- provider
- customer
- accounting account
- payment status
- employee
- department
- warehouse
- project
- channel

Required behavior:

- show the filtered result count
- provide a clear/reset action
- reset dependent filters when their parent scope changes
- Unit filters the available Business options
- custom periods expose From and To fields
- recoverable analytics filters persist across tab navigation and reload according to Section 10.2
  of the Frontend Operating System; explicitly mapped URL values override remembered values
- exported data uses the active filters
- changing a filter resets table pagination to page 1

When the analytics scope has more than four useful filters, apply the progressive-disclosure
contract from Section 13 of the Frontend Operating System. Keep Search and the two or three
decision-critical controls visible; place secondary scope controls behind `More filters`, expose
the active-secondary count, automatically reveal restored active values, and make Clear restore
the analytics view's documented factory scope. With four or fewer useful controls, keep the normal
responsive grid and do not add an unnecessary disclosure action.

Analytics memory stores safe scope and presentation choices only. Never persist fetched totals,
exchange rates, permission results, open dialogs, loading/error state, or a pending export as tab
memory. Column preferences for the contextual table remain independent from the global filter
scope and follow Section 17 of the Frontend Operating System.

Visual contract:

- white or dark-neutral card
- 24px outer radius
- labels above controls
- 44px control height
- 12px control radius
- module-color focus ring
- responsive wrapping
- no filters scattered between charts

For a small bounded period set, a segmented selector may replace the period dropdown while
remaining inside the shared filter-bar shell. It must use the same label, height, radius,
focus, responsive, and accessibility rules as the other controls. Refresh is a view-level
action and belongs in the title bar unless it directly changes the filter scope.

---

## 6. Data Context Strip

Place a compact context strip between filters and KPI cards when the data requires
interpretation.

It may show:

- preferred display currency
- native currencies represented
- exchange-rate mode
- exchange-rate effective date
- last data refresh
- fallback or stale-data warning
- selected organizational scope

Rules:

- it is informational, not a second filter bar
- it must remain compact
- warnings must be visible and understandable
- legally relevant and row-level amounts preserve their native currency
- converted totals must clearly identify the display currency

### 6.1 Preferred-currency boundary

The preferred business currency has a deliberately narrow presentation scope.

It may influence only:

- operational KPI bars;
- KPI and Indicators dashboards;
- charts, rankings, and analytical totals that must consolidate records from
  more than one native currency.

It must not rewrite or replace the native currency in:

- transaction tables;
- record detail views and operational files;
- forms and persisted transactions;
- transactional exports, receipts, invoices, payroll lines, or legal documents.

Transaction rows always show their native amount and currency. A table footer
must preserve a native-currency breakdown unless it is explicitly part of an
analytics surface governed by this standard.

Every monetary KPI aggregation must:

1. group amounts by native currency;
2. retain the native-currency breakdown;
3. convert each native subtotal to the preferred currency;
4. expose the native breakdown and the consolidated preferred-currency total as
   different monetary bases, following the presentation rule in Section 6.2;
5. identify the preferred currency, represented native currencies, exchange-rate
   mode, source, and effective date;
6. disclose records excluded because a valid exchange rate is unavailable.

Open operational views use the current daily reference or the company-configured
rate. Closed cuts, payroll periods, commission settlements, and other frozen
business events retain their closing exchange-rate snapshot and must not be
retroactively recalculated.

Changing the preferred currency is a KPI presentation action. It must never
mutate a transaction, its native amount, its native currency, or its historical
exchange-rate evidence.

Missing rates must never fall back silently to `1:1`. The KPI must be labeled as
a partial total, preserve the excluded native amounts, and state how many records
were not consolidated.

Authoritative monetary aggregates and conversion snapshots belong to the backend.
Frontend utilities may adapt an existing backend response for presentation during
migration, but a module is not financially complete until its KPI endpoint returns
the native totals, preferred total, rate context, exclusions, and calculation scope.

### 6.2 Multi-currency operational KPI bar

A compact operational KPI bar that combines sales, payment composition, and activity
counts uses two explicitly different monetary bases:

- **native basis** answers which currencies were actually received;
- **preferred basis** provides one converted amount for comparison, ratios, and averages.

Neither value replaces the other. The native breakdown provides traceability, while the
preferred total provides a comparable analytical basis.

Use this order:

1. native sales breakdown;
2. payment-method composition;
3. total in the preferred currency;
4. derived monetary averages;
5. non-monetary counts and exception indicators.

Approved compact pattern:

```txt
Sales by currency          Cash     Card     Transfer     Credit
MXN $4,389.44 / USD US$90  ...      ...      ...          ...

Total in preferred currency - MXN     Average ticket     Average closing
MXN $5,970.22                         MXN $373.14         MXN $663.36
```

Presentation rules:

- Show every native subtotal separately and always include its ISO currency code, such
  as `MXN`, `USD`, or `CAD`. A currency symbol alone is not sufficient.
- Never display one raw sum of amounts from different native currencies.
- Payment-method totals in the same operational bar use one common basis: the converted
  preferred-currency aggregate returned by the backend. The bar or its labels must make
  that ISO currency context explicit.
- Place `Total in preferred currency - {ISO}` immediately after the payment-method
  composition. Do not hide it in a tooltip, an unlabeled chip, or the global currency
  selector.
- Calculate `Average ticket` as the converted preferred total divided by the number of
  tickets included in that converted total.
- Calculate `Average closing` as the converted preferred total divided by the number of
  closings included in that converted total.
- If a currency is excluded because no valid rate exists, exclude its records from the
  related average denominator too. Mark the preferred total and affected averages as
  partial or unavailable and name the excluded currencies.
- Counts such as tickets and closings remain unconverted and must not imply a currency.
- Routine success labels such as `Balanced` do not occupy the limited right-side KPI
  area by default. Reserve that area for useful counts and actionable exceptions such as
  shortages, overages, stale rates, or excluded currencies.
- The leading native-sales item may use the active module accent color. Color identifies
  the module or metric role, never a permanent currency mapping.

When only one native currency is represented, retain its ISO code. The native sales value
and the preferred total may be numerically equal, but their labels still describe different
roles. They may be visually condensed only when the distinction remains explicit and no
future multi-currency state would change the meaning of the bar.

This operational-bar rule is intentionally different from an analytical KPI card. On an
analytics dashboard, the consolidated preferred total may remain the primary card value
with the native breakdown as nearby context. In an operational payment-composition bar,
the native breakdown leads and the converted preferred total follows the composition.

---

## 7. Eight KPI Rule

An analytics tab should use exactly eight primary KPI cards when the module has eight
meaningful decisions to support.

For the internal-view format, this count applies to `overview` only. The other
views contain their own analysis or detail; they do not each require eight cards.

Do not invent weak metrics merely to reach eight. If a module genuinely cannot support
eight decision-oriented metrics, document the exception before implementation.

Desktop placement:

- four cards per row
- two rows

Tablet placement:

- two cards per row

Mobile placement:

- one card per row

The eight cards must collectively cover different questions. A recommended balance is:

1. Scale or total activity.
2. Completed or successful activity.
3. Open or pending work.
4. Risk or overdue work.
5. Compliance or punctuality.
6. Plan or target variance.
7. Near-term projection.
8. Composite health or readiness score.

The labels and formulas must be adapted to the module.

---

## 8. KPI Card Contract

Every KPI must be defined before implementation with this contract:

| Field | Requirement |
|---|---|
| Name | Short, localized, and unambiguous |
| Business question | The decision the metric supports |
| Formula | Exact calculation and exclusions |
| Source | API entities and fields used |
| Format | Currency, percentage, count, duration, or score |
| Comparison | Previous period, target, budget, or benchmark |
| Thresholds | Healthy, review, and critical rules |
| Helper | One short contextual fact |
| Description | Operational meaning of the value |
| Action | Destination or filter applied when selected |
| Empty behavior | What zero, missing, or unavailable means |

Required card anatomy:

- contextual icon
- concise label
- primary value
- semantic status badge
- progress or target indicator when meaningful
- comparison or helper text
- one-sentence explanation

Status vocabulary:

- Healthy
- In review
- Critical

These labels must be localized. Semantic colors must not be replaced by the module
identity color.

Composite scores must expose their weighting. A user must be able to understand why a
score changed.

---

## 9. Period Comparison

Primary KPI values should include a useful comparison whenever historical data exists.

Default comparison:

- current month vs previous calendar month
- previous month vs the calendar month before it
- current year vs previous calendar year
- custom range vs the immediately preceding range of equal duration

Display examples:

```txt
Up 12% vs previous period
Down $35,000 vs previous period
No previous comparison base
```

Rules:

- never divide by zero
- distinguish favorable and unfavorable movement
- an upward arrow is not automatically positive
- use calendar periods, not arbitrary day counts, for calendar filters
- state when historical snapshots are unavailable

---

## 10. Primary Analytics Section

Use charts only when the visual relationship is easier to understand than a table or
short sentence.

An analytics tab should normally answer these questions:

1. What is the composition?
2. How is it changing over time?
3. How do organizational units compare?
4. How does actual performance compare with plan or target?

Recommended chart mapping:

| Question | Preferred chart |
|---|---|
| Composition | Donut or stacked bar |
| Trend | Line or area chart |
| Unit comparison | Horizontal bar chart |
| Plan vs actual | Grouped bar chart |
| Aging | Ordered horizontal bars |
| Forecast | Column or line chart |
| Distribution | Histogram or stacked bar |

Every chart requires:

- localized title
- one-sentence purpose
- units on values or axes
- tooltip
- legend when multiple series exist
- empty state
- accessible color contrast
- responsive container
- record-level or filter action when appropriate

Avoid using multiple charts to repeat the same totals.

---

## 11. Unit Comparison

Every cross-organizational analytics tab should compare Units, Businesses, locations,
departments, or another approved organizational dimension.

Rules:

- use the same metric and currency for every compared entity
- show `Unassigned` explicitly rather than hiding it
- sort by the decision-relevant value
- allow selection to narrow the global scope when useful
- do not imply performance quality from volume alone
- include targets or denominators when comparing percentages

If a module has no organizational dimension, document the contextual substitute.

---

## 12. Module-Specific Operational Analysis

Each module may add analysis that represents its own operational risk.

Examples:

### Expenses And Receivables

- aging buckets
- cash requirements
- budget variance
- taxes
- overdue balances
- evidence or document coverage

### Human Resources

- attendance distribution
- lateness
- staffing coverage
- expiring permissions or documents
- payroll variance

### Sales

- funnel conversion
- sales-cycle duration
- target attainment
- lost-reason distribution
- forecast

### Inventory

- stock coverage
- rotation
- stockout risk
- dead stock
- purchase requirements

The section is mandatory in concept, but its information must be native to the module.

---

## 13. Tops And Concentration Rankings

Use tops to reveal concentration, contribution, risk, or opportunity.

Recommended count:

- two to four ranking panels
- up to five visible rows per panel

Each row should show:

- position
- entity name
- main value
- share or progress indicator
- optional count

Examples:

- top providers
- top customers
- top accounting accounts
- top products
- top departments
- top absence causes

Required interaction:

- selecting a valid row narrows the relevant global filter or opens the supporting records
- `Unassigned` rows remain visible but must not create an invalid filter

Rankings must not shame users or employees. They must use transparent, job-relevant
criteria and appropriate permissions.

---

## 14. Contextual Performance Table

The final analytical table compares the actors or entities that drive the module.

Possible entities:

- employees
- responsible users
- providers
- customers
- products
- projects
- warehouses
- organizational units

The entity must make sense in the module context.

Recommended columns:

- position
- entity
- score or main outcome
- activity volume
- compliance
- quality or evidence
- risk
- status
- action

Required:

- sortable data when useful
- visible scoring formula
- pagination using `10, 25, 50, 100, 200`
- page reset when filters change
- horizontal scrolling on narrow screens
- empty state
- permission-aware actions
- drill-down to supporting records

The table must not calculate employee performance from hidden or arbitrary criteria.

---

## 15. Data And Formula Integrity

Analytics must be calculated from real module data.

Required:

- normalize API entities through adapters
- define inclusions and exclusions
- use one source of truth for each metric
- avoid recomputing the same formula differently across cards and charts
- use stable date boundaries and the company timezone
- expose fallback data states
- distinguish zero from unavailable
- preserve decimal precision during calculation
- format only at presentation time

For monetary analytics:

- convert each native amount before summing
- never sum mixed raw currencies
- show the preferred currency
- show native-currency context
- show exchange-rate date and warning state
- distinguish subtotal, tax, total, paid amount, and balance

For time-based compliance:

- define the event date
- define the deadline date
- exclude incomparable records explicitly
- do not call payment progress `punctuality`

---

## 16. Actionability And Drill-Down

Every critical insight should provide a path to its supporting records.

Examples:

- select overdue balance -> open overdue records
- select missing evidence -> open records without attachments
- select a unit bar -> filter by Unit
- select a provider ranking -> filter by Provider
- select a responsible user -> open their scoped records

Rules:

- preserve the active scope during navigation
- provide a way to clear the applied filter
- do not use silent actions
- do not make a card clickable if no action exists
- keyboard users must be able to trigger the same action

---

## 17. States

The entire KPI tab and every independent panel must define:

### Loading

- stable skeleton dimensions
- no layout jump
- charts reserve their final height

### Empty

- explain the active scope
- distinguish no records from zero activity
- suggest a relevant next action when possible

### Partial Data

- identify unavailable sources
- continue with valid sources when safe
- never present fallback values as complete data

### Error

- visible localized message
- retry action when realistic
- no raw backend exception in the UI

### Permission Restricted

- hide sensitive values when required
- preserve the understandable layout
- explain unavailable actions without exposing restricted data

---

## 18. Responsive Behavior

Desktop `>=1280px`:

- grouped view selector between the title and filters, with equal 24 px gaps
- four KPI cards per row
- charts commonly use two columns
- ranking panels may use two to four columns
- full analytical table

Tablet `768-1279px`:

- two KPI cards per row
- charts use one or two columns based on readability
- filters wrap predictably

Mobile `<768px`:

- internal view buttons wrap without clipped labels or page overflow
- title, selector and filters retain equal 24 px vertical gaps
- one KPI card per row
- charts use one column
- legends wrap or move below charts
- tables scroll horizontally or use an approved mobile analytical card
- no clipped tooltips or controls

Fixed chart heights must remain stable across loading, empty, and populated states.

---

## 19. Accessibility And Localization

Required:

- all visible copy lives in module-local translations
- support all locales required by the Frontend Operating System
- use locale-aware numbers, currencies, percentages, and dates
- provide text labels in addition to color
- maintain WCAG AA contrast
- preserve keyboard navigation
- give icon-only actions accessible names
- provide chart summaries or equivalent accessible context
- do not rely on hover as the only way to reveal critical information

Long translated labels must wrap without changing the meaning or breaking card height.

---

## 20. Recommended Component Architecture

The page component should orchestrate data and layout. It must not contain all formulas,
charts, cards, tables, and visible copy in one file.

Recommended structure:

```txt
KPIs/
  IndicatorsPage.tsx
  components/
    IndicatorsTitleBar.tsx
    IndicatorsFilters.tsx
    DataContextStrip.tsx
    KpiCard.tsx
    KpiGrid.tsx
    charts/
      CompositionChart.tsx
      TrendChart.tsx
      UnitComparisonChart.tsx
      PlanVsActualChart.tsx
    rankings/
      TopRankingPanel.tsx
    table/
      PerformanceTable.tsx
  hooks/
    useIndicatorsData.ts
    useIndicatorsFilters.ts
    useIndicatorsPagination.ts
  calculations/
    indicatorCalculations.ts
    indicatorThresholds.ts
  translations/
  types/
```

Shared primitives may provide visual shells, but business formulas remain inside the
owning module.

Do not create a global KPI service containing unrelated module logic.

---

## 21. KPI Definition Template

Use this template before coding a KPI:

```md
### [KPI name]

- Business question:
- Formula:
- Included records:
- Excluded records:
- Data source:
- Display format:
- Comparison:
- Healthy threshold:
- Review threshold:
- Critical threshold:
- Helper text:
- User action:
- Empty/unavailable behavior:
```

---

## 22. Module Implementation Template

```md
## Module: [Module name]

### Decisions Supported

1. ...

### Global Filters

- Search:
- Unit:
- Business:
- Period:
- Status:
- Contextual filters:

### Internal Views And Presentation Parameters

- Module key and approved tone:
- Navigation: `IndiceWorkspaceNavigation`, `variant="views"`.
- Layout: `grid min-w-0 grid-cols-1 gap-6`; equal 24 px gaps between bars.
- Overview: primary cards, insight and totals assigned here.
- Charts: existing distributions, trends and operational analyses assigned here.
- By unit: comparison dimension, rankings and summary table, or documented substitute.
- Detail: English view identifier, localized entity label, table and attention cases.
- Initial/fallback view: `overview`.
- View URL key: `view`, or the module's existing documented mapping.
- Filter, view and table-state retention:
- Duplicated panels consolidated and interactions preserved:
- Refresh scope and print/export scope:
- Data warnings visible across views:
- Approved exceptions, if any:

### Eight KPI

1. ...
2. ...
3. ...
4. ...
5. ...
6. ...
7. ...
8. ...

### Primary Charts

- Composition:
- Trend:
- Unit comparison:
- Plan/target comparison:

### Module-Specific Analysis

- ...

### Tops

- ...

### Performance Table

- Entity compared:
- Score formula:
- Columns:
- Drill-down action:

### Data Context

- Preferred currency behavior:
- Native context:
- Operational multi-currency bar order, if used:
- Payment-method and average calculation basis:
- Freshness:
- Warnings:

### Permissions

- ...
```

---

## 23. Reference Implementations

### 23.1 Human Resources: information organization and visual layout

Human Resources is the approved reference for the basic-module internal-view
format, module-colored selector, shared filters and equal spacing between bars.

Reference files:

- `react/src/app/BasicModules/HumanResources/KPIs/KPIs.tsx`
- `react/src/app/BasicModules/HumanResources/KPIs/translations/workspaceCopy.ts`
- `react/src/app/components/frontend-os/IndiceWorkspaceNavigation.tsx`
- `react/src/app/hooks/useWorkspaceNavigationMemory.ts`
- `react/tests/hr-kpi-views-regression.test.mjs`

Reuse the shared navigation and layout contract, not RH's business formulas or
its employee-specific content. The analysis in
[`indice-hr-kpi-analysis-2026-09-15.md`](./indice-hr-kpi-analysis-2026-09-15.md)
records the visual implementation and separately tracks known data/calculation
issues; earlier seven-view mockups in that analysis are not this standard.

### 23.2 Expenses: financial analysis concepts

The Expenses `Indicators` tab remains a reference for financial analysis concepts.
For the distribution into internal views, Section 3 and the Human Resources
presentation reference control; an existing single-page Expenses layout does not
override the approved view organization.

Reference files:

- `react/src/app/BasicModules/Expenses/KPIs/GastosKPIPage.tsx`
- `react/src/app/BasicModules/Expenses/KPIs/useFinancialOverview.ts`
- `react/src/app/BasicModules/Expenses/KPIs/financialOverviewCalculations.ts`

Reference concepts:

- global organizational and financial filters
- eight decision-oriented KPI cards
- calendar-period comparison
- preferred-currency consolidation
- payment composition
- unit comparison
- expense trend
- budget vs execution
- aging buckets
- cash forecast
- tax summary
- data-quality exceptions
- provider, accounting-account, and business tops
- role-selectable responsible-user ranking
- paginated performance table

The Expenses implementation is a conceptual and visual reference, not a source for
copying module-specific formulas.

Before it is treated as a final reusable code reference, its page-level implementation
should continue moving visible copy, business calculations, and large visual sections
into local translations, calculation utilities, hooks, and focused components according
to Section 20.

---

## 24. Acceptance Checklist

A KPI tab is complete only when:

- [ ] It follows the Frontend Operating System.
- [ ] It has a compact localized title bar.
- [ ] Its title-bar actions follow the three-direct-actions and fourth-overflow-control rule.
- [ ] A basic-module KPI tab uses the internal-view mapping, or records a domain-specific exception.
- [ ] The selector uses `IndiceWorkspaceNavigation` with `variant="views"` and the module tone.
- [ ] Title-to-selector and selector-to-filter gaps are both 24 px, with aligned left edges.
- [ ] Only the selected view's content is visible; primary cards appear in Overview only.
- [ ] Each existing chart, ranking, table and drill-down has a clear location; duplicates are consolidated.
- [ ] It has one global filter scope.
- [ ] More than four useful filters use the shared progressive-disclosure pattern.
- [ ] Its safe filter scope survives tab navigation and reload without crossing user or company scope.
- [ ] Direct URL fields override remembered filter values.
- [ ] Switching views preserves filters and table state; unsupported view identifiers fall back safely.
- [ ] View switching does not repeat the dashboard fetch or render charts inside hidden containers.
- [ ] Refresh remains global and print/export retains its declared scope, regardless of visible view.
- [ ] Partial-data warnings remain visible across views.
- [ ] Search appears first when the analytics view supports record search.
- [ ] Unit and Business dependency works correctly.
- [ ] Filter changes update cards, charts, rankings, tables, and exports.
- [ ] It has eight decision-oriented KPI or a documented exception.
- [ ] Every KPI has a documented formula and thresholds.
- [ ] Historical comparisons use correct period boundaries.
- [ ] It distinguishes progress, compliance, and punctuality.
- [ ] It includes a meaningful organizational comparison.
- [ ] Every chart answers a different business question.
- [ ] It includes module-specific operational analysis.
- [ ] Tops reveal concentration, risk, or opportunity.
- [ ] The performance entity and score are transparent.
- [ ] The table paginates with `10, 25, 50, 100, 200`.
- [ ] Critical insights offer a drill-down path.
- [ ] Monetary totals never sum mixed raw currencies.
- [ ] Operational multi-currency bars separate ISO-labeled native totals from the
      consolidated preferred-currency total.
- [ ] Payment-method totals and monetary averages use the same declared conversion basis.
- [ ] Currency, exchange-rate date, and freshness are visible when relevant.
- [ ] Loading, empty, partial, error, and permission states exist.
- [ ] Light mode and dark mode work.
- [ ] Desktop, tablet, and mobile layouts work.
- [ ] Visible copy is localized.
- [ ] Keyboard and contrast requirements are met.
- [ ] Existing APIs and business contracts remain intact unless separately authorized.
- [ ] Focused flow regression covers view switching, retained filters, detail actions and report scope.
- [ ] TypeScript passes.
- [ ] Production build passes.

Required commands:

```bash
npm run typecheck --prefix react
npm run build --prefix react
```

---

## 25. Change Governance

When this standard evolves:

1. Update this document first.
2. Explain whether the change is required or recommended.
3. Update the Frontend Operating System link only if the document path changes.
4. Apply the change to the reference implementation.
5. Validate at least one additional module before describing the pattern as verified
   beyond the reference implementation. Record adoption and verification per module;
   approval of this standard alone does not mean all modules have migrated.
6. Avoid retroactive mass changes without module-by-module verification.

The goal is one coherent analytics language across Indice, adapted to each module's
actual decisions and data.


### Processes and Tasks adoption (2026-09-15)

Processes and Tasks implements Overview / Analysis / By unit / Performance with
the shared yellow view selector and 24 px shell spacing. Its authorized additive
measurement contract, compatibility boundaries and complete-report scope are
defined in [`processes-tasks-kpi-measurement-contract.md`](./processes-tasks-kpi-measurement-contract.md).
This adoption does not change another module’s formulas or views.

### Expenses adoption (2026-09-15)

Expenses implements Overview / Analysis / By unit / Control and detail using the
shared green view selector, global filters and equal 24 px gaps. Its measurement
review and explicit financial boundaries are defined in
[`expenses-kpi-workspace-contract.md`](./expenses-kpi-workspace-contract.md), with
local validation in [`indice-expenses-kpi-analysis-2026-09-15.md`](./indice-expenses-kpi-analysis-2026-09-15.md).
The eight-card mapping replaces the synthetic financial-health card with separate
captured/recognized expense and owner budget availability. Volume cards do not
receive invented health thresholds. Monetary ownership remains with the existing
backend engine; neither layout reuse nor this adoption certifies historical closing
balances, tax recoverability or company liquidity.

### Petty Cash adoption (2026-09-15)

Petty Cash implements Overview / Analysis / By unit / Statements and receipts with
green shared navigation, retained filters/table state, and equal 24 px gaps.
[`petty-cash-kpi-workspace-contract.md`](./petty-cash-kpi-workspace-contract.md)
defines eight operational measurements, company-versus-third-party custody scope,
historical classification, signed current balances, receipt authorization and complete
filtered reports. Company financial metrics remain company-only; additive custody
aggregates require the Petty Cash KPI permission. There is no synthetic health score.
Validation is recorded in
[`indice-petty-cash-kpi-analysis-2026-09-15.md`](./indice-petty-cash-kpi-analysis-2026-09-15.md).

### Receivables adoption (2026-09-15)

Cartera adds its own Indicators tab with Overview / Analysis / By unit / Accounts and
collections, green shared navigation and equal 24 px gaps. Operational tabs remain
available. [`receivables-kpi-workspace-contract.md`](./receivables-kpi-workspace-contract.md)
defines the eight measurements, current versus period scope, instalment-based ageing,
customer identity, read-only permissions and full filtered reports. Validation is in
[`indice-receivables-kpi-analysis-2026-09-15.md`](./indice-receivables-kpi-analysis-2026-09-15.md).

### Sales adoption (2026-09-16)

Sales implements Overview / Analysis / By unit / Opportunities with coral shared
navigation, dependent organization filters, retained view/table state and equal 24 px
gaps. [`sales-kpi-workspace-contract.md`](./sales-kpi-workspace-contract.md) defines the
eight measurements, event-period versus current-stock semantics, opportunity-linked
funnel, stable seller identity, server-owned operational scope and complete filtered
report. Validation and the defects replaced from the previous page are recorded in
[`indice-sales-kpi-analysis-2026-09-16.md`](./indice-sales-kpi-analysis-2026-09-16.md).
Registered sales are not relabelled as accounting revenue; partial monetary conversion
does not produce a complete headline or average, and unavailable historical metrics are
not inferred from current CRM snapshots.
