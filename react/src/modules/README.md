# Dormant Frontend Module Scaffold

Status: historical scaffold, not connected to the active production router.

The canonical frontend standard is `docs/indice-frontend-operating-system-v2.md`. Production modules
currently live under `react/src/app`; new features and refactors must remain with their active owner
there unless a dedicated migration explicitly activates this tree.

This directory is retained as an architecture experiment. Do not create duplicate production
modules here and do not treat the files below as evidence that Human Resources has been migrated.

## Original Prototype Principles

- Every module lives in its own folder.
- Every internal tab or section lives in its own folder.
- Every module must be exportable without hidden dependencies on sibling modules.
- Shared code must live in `shared/` and remain framework-light.
- All new frontend code in this directory must be written in English.

## Standard Structure

```text
src/modules/
  shared/
    ModuleShell.tsx
    createModuleRoutes.ts
    moduleTypes.ts
    index.ts
  hr/
    HrModule.tsx
    index.ts
    module.config.ts
    routes.tsx
    components/
      index.ts
    hooks/
      index.ts
    services/
      index.ts
    types/
      index.ts
    tabs/
      employees/
        EmployeesPage.tsx
        index.ts
      attendance/
        AttendancePage.tsx
        index.ts
      payroll/
        PayrollPage.tsx
        index.ts
      performance/
        PerformancePage.tsx
        index.ts
      index.ts
```

## Naming Rules

- Folders: lowercase kebab-case for tabs, short lowercase for module ids when possible.
- Components: PascalCase.
- Routes: lowercase kebab-case.
- Config files: `module.config.ts` and `routes.tsx`.
- Entry points: `index.ts`.

## Current Policy

- Active modules under `src/app` remain the production source of truth.
- No migration into `src/modules` is currently approved.
- An approved future migration must define routing, shared-component ownership, translations,
  permissions, API compatibility, regression coverage, and removal of the duplicate entry point.
- Until then, do not add production work or run the prototype scaffold generator.

## Prototype Scaffold Command

The repository contains `react/scripts/scaffold-module.mjs`, but it is not registered as an active
production workflow. The historical command below is documentation only:

```bash
npm run scaffold:module -- --module hr --name "Human Resources" --route human-resources --tabs employees attendance payroll performance
```

Do not use this command for production work until an approved migration reactivates and verifies the
architecture.
