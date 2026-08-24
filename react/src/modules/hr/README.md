# Human Resources

Status: dormant scaffold example. The active Human Resources module lives under
`react/src/app/BasicModules/HumanResources` and remains the production source of truth.

## Route

`/human-resources`

## Tabs

- `employees` -> Employees
- `attendance` -> Attendance
- `payroll` -> Payroll
- `performance` -> Performance

## Notes

- Keep all business-specific components inside this module.
- Reuse shared code only through `src/modules/shared`.
- Avoid importing from sibling modules.
- Do not extend this scaffold for production behavior unless the `src/modules` migration is
  explicitly approved and activated.
