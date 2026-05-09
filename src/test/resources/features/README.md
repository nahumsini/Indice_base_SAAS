# Gherkin Flow Documentation

This folder is reserved for Gherkin `.feature` files that describe Indice user and API flows.

Current intent:

- Keep flows readable for product, QA, and engineering.
- Organize files by module so each business area has a clear home.
- Start as documentation-first Gherkin.
- Add Cucumber dependencies and step definitions later only when selected flows need automated execution.
- Track known planned and not-yet-implemented behavior in `NOT_IMPLEMENTED.md`.

Suggested file naming:

- Use lowercase words separated by hyphens, for example `login.feature`.
- Keep one user flow or API flow per feature file.
- Start each scenario from the user's business goal before describing UI or API details.
- Tag scenarios with `@implemented` when the current app already supports the behavior.
- Tag scenarios with `@planned` when the flow describes intended behavior that still needs code.
- Tag scenarios with `@frontend-only` when the screen behavior exists but is not backed by persisted APIs yet.
- Tag permission and visibility rules with `@access-control`.

Common roles:

- `owner user`: full company setup and administration access.
- `admin user`: operational administrator access.
- `hr user`: HR management access.
- `normal user`: personal profile, personal attendance, personal schedule, and allowed kiosk actions only.

Folders:

- `authentication/`
- `dashboard/`
- `config_center/`
- `human_resources/`
- `processes_tasks/`
- `api_documentation/`
