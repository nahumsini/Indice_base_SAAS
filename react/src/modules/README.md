# Frontend Module Architecture

This directory is the canonical frontend architecture for new ERP modules.

## Principles

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

## Migration Policy

- Existing legacy modules under `src/app` can continue to run while we migrate.
- New module work should start in `src/modules/<module-id>`.
- Legacy modules should be wrapped or adapted into this structure incrementally instead of refactored all at once.

## Scaffold Command

Run this from the `react/` directory:

```bash
npm run scaffold:module -- --module hr --name "Human Resources" --route human-resources --tabs employees attendance payroll performance
```

The generator creates a fully structured module with isolated tabs, shared exports, and route helpers.
Use `--category complementary` or `--category ai` when the module does not belong to the basic ERP suite.
