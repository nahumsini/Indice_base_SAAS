# Planned And Not Implemented Yet

This file lists flows that are documented in Gherkin but are not fully implemented or not fully enforced yet. The source of truth for each item is the related `@planned` scenario in the `.feature` files.

## Access Control Foundation

- Role and module-access rules are not yet used consistently as the enforcement layer across frontend navigation and backend APIs.
  - Related scenario: `authentication/session.feature` - `Role is reused by module access rules`

- Hidden tabs and routes still need direct-route and direct-API protection, not only frontend visibility changes.
  - Related scenarios: `dashboard/home_panel_access.feature`, `human_resources/hr_access_control.feature`

## Home Panel And Dashboard

- Owner/admin visibility for company setup areas still needs to be enforced as a formal access rule.
  - Related scenario: `Owner or admin user sees company setup tabs`

- Normal users should only see personal areas in Home Panel.
  - They should not see Business Structure.
  - They should not see Business Profile.
  - They should only see their own user/profile-related areas.
  - Related scenario: `Normal user sees only personal areas in Home Panel`

- Normal users should not be able to open hidden Home Panel routes directly by URL.
  - Related scenario: `Normal user cannot open hidden Home Panel routes directly`

- Personal Performance still needs strict current-user scoping.
  - Related scenario: `User sees only their own Personal Performance`

- Business Profile still needs normal-user blocking.
  - Related scenario: `Normal user cannot manage Business Profile`

## Config Center

- Business Structure management still needs normal-user blocking.
  - Related scenario: `Normal user cannot manage Business Structure`

- Company Settings management still needs normal-user blocking.
  - Related scenario: `Normal user cannot manage company settings`

## Human Resources

- HR workspace visibility still needs user-type-based tab filtering.
  - Users with the hr user type should see HR management tabs.
  - Normal users should see only personal HR areas.
  - Related scenarios: `HR user sees HR management tabs`, `Normal user sees only personal HR access`

- HR tab visibility still needs complete normal-user filtering.
  - Normal users should not see Collaborators, Control, Payroll, Announcements management, Assets, Records, Permissions, Incentives, or KPIs management tabs unless explicitly allowed.
  - Related scenario: `Normal user sees only personal HR access`

- Normal users should not be able to call HR administration endpoints directly.
  - Related scenario: `Normal user cannot call HR administration endpoints directly`

- User directory access still needs normal-user restriction.
  - Normal users should not see all users or user profiles.
  - Related scenario: `Normal user cannot see all users`

- Attendance control still needs normal-user restriction.
  - Normal users should not manage schedules, locations, assignments, or corrections for other users.
  - Related scenario: `Normal user cannot manage attendance control`

- Self-service attendance still needs explicit direct-access protection for other users' data.
  - Related scenario: `Normal user cannot request another user's attendance`

- Kiosk management still needs normal-user restriction.
  - Normal users may use kiosk check-in/check-out flows.
  - Normal users should not manage kiosk devices.
  - Related scenario: `Normal user can use kiosk but cannot manage kiosk devices`

- Payroll still needs normal-user blocking.
  - Related scenario: `Normal user cannot see payroll`

- Company assets still need normal-user management blocking.
  - Related scenario: `Normal user cannot manage company assets`

- HR records still need normal-user management blocking.
  - Related scenario: `Normal user cannot manage HR records`

- Face enrollment and biometric management still need normal-user blocking.
  - Related scenario: `Normal user cannot manage biometric enrollment`

- Announcements still need targeted visibility for normal users.
  - Related scenario: `Normal user can read targeted announcements only`

- Permissions and absence requests are frontend-only right now and still need backend persistence.
  - Requests should survive page refresh.
  - Normal users should see only their own requests.
  - Manager approval actions should be user-type-restricted.
  - Related scenarios: `Permission requests persist in the backend`, `Normal user sees only their own permission requests`

- Incentives are frontend-only right now and still need backend persistence.
  - Incentive rules should be saved to the backend.
  - Payroll should be able to consume approved incentive data.
  - Normal users should not manage incentive rules.
  - Related scenarios: `Incentives persist in the backend`, `Normal user cannot manage incentives`

- HR KPIs are frontend-only/static right now and still need backend-calculated values.
  - KPI values should come from user, user profile, attendance, payroll, permission, asset, and record data.
  - KPI values should respect the user's allowed data scope.
  - Related scenarios: `HR KPIs are calculated from backend data`, `HR KPIs respect user data scope`

## Processes, Tasks, Projects, Agenda, KPIs, And Org Chart

- Task creation linked to a process or project is not fully backend-connected yet.
  - Related scenario: `User creates a task linked to a process or project`

- Task status and assignment updates are not fully backend-connected yet.
  - Related scenario: `User updates task status and assignment`

- Agenda quick tasks, task filters, task dialogs, files, reports, and audit flows are currently frontend state and still need backend persistence.
  - Related scenarios: `User filters and reviews the Agenda tab`, `User creates a quick task from Agenda`

- Project task management is not fully backend-connected yet.
  - Related scenario: `User manages project tasks`

- Projects task and diagram views are currently frontend state and still need backend persistence.
  - Related scenarios: `User reviews Projects in task and diagram views`, `User creates a quick task from a project`

- Processes and Tasks KPIs are currently frontend-only/static and still need backend-calculated metrics.
  - Related scenario: `User filters process KPIs`

- Org chart changes are not persisted to the backend yet.
  - Related scenarios: `User edits the Org Chart locally`, `User persists org chart changes`

- Process data still needs normal-user scoping.
  - Related scenario: `Normal user sees only allowed process data`

## API Documentation

- OpenAPI documentation exists, but protected APIs still need explicit session/authentication requirements documented consistently.
  - Related scenario: `Protected APIs document session requirements`
