# Users module/access assignment review — 2026-10-28

## Scope and evidence

Local review base: `e0606e7021b4e1f635b8c8ebdf26a175971553e4` (HEAD, main and origin/main at
inspection). Working branch: `codex/fix-users-module-access-20261028`. The affected Users/access
files had no changes between the supplied `0b2da6177b3681bd911e74aff012c52a462bec65` and this
base, or between the deployed application source `5e6a227e` and this base. This does not establish
when the defect began and does not attribute it to recent updates.

Production was inspected read-only. Running frontend/backend image tags were
`indice-erp-web:5e6a227ecf21-secure` and `indice-erp-backend:5e6a227ecf21-secure`. The current
registry/entitlement snapshot for Índice Technologies contained 15 modules satisfying active
module, ACTIVE entitlement, enabled assignment and pilot/released lifecycle. It also contained
non-enabled modules. A blanket explanation that this company has no enabled modules is not
supported by that snapshot. No production users, permissions, entitlements, contracts or data were
changed. No deployment or synthetic MCP plugin was used as evidence.

The owner confirmed that the notice appears after pressing Save. The original HTTP status/body,
selected modules, target access snapshot and actor's resolved company context were not available.
The retained backend container logs for the last 48 hours contained no matching Users PUT request;
absence in those retained logs does not prove no request occurred. The actual incident cannot yet
be attributed to one validation branch. Minimal remaining evidence: the failed request's path
(with the user identifier masked), HTTP status and response code/message; no cookies, tokens,
full HAR or personal data are needed.

## Confirmed defects and demonstrated scope

1. `Users.tsx` discarded registry rows with no frontend presentation mapping, filtered target module
   assignments through the visible/actor list, then validated only that filtered selection.
   The payload builder separately retained unavailable prior slugs, but a visibly empty draft could
   block before reaching that builder. This is reproducible locally: previous hidden/non-editable
   grants must count, without treating forbidden new grants as grandfathered.
2. Undefined entitlement/assignability metadata defaulted to true in the frontend mapper. A missing
   row or field could therefore be hidden or misrepresented instead of explicitly unknown.
3. Module availability, delegation ceiling, empty selection and tab validation failures were mapped
   to overlapping generic messages. Backend module/tab checks lacked distinct stable codes.
4. The owner resolves effective role using the active company's membership, with the existing
   protected fallback for an upstream-authorized delegated workspace. The UI used a separate
   current-profile role projection. The correction uses the Users projection for consistency;
   no mismatch in the original incident was proven. Inspection also confirmed that the current
   session resolver normally rechecks membership and that the profile endpoint echoes its supplied
   current role; neither the user's label "root" nor a global account label proves company authority.

The same picker and policy serve invitation and user editing. Preservation applies only to
existing user assignments; invitations have no grandfathered assignments. The defect is conditional
on catalogue/assignment/role state, not proven universal. No distributor-specific branch exists in
these shared handlers. A distributor commercial identity does not itself determine the company
membership role. Tests cover ordinary users presented as distributor targets, Admin, protected
roles, delegated workspace compatibility and company boundaries; they do not impersonate the
production distributor.

## Implemented behavior and preserved contracts

- The complete actor-authorized catalogue is rendered, including inactive registry entries within
  the existing visibility ceiling. Module name/route presentation failure no longer drops a row.
- Company availability, administrator assignability and prior assignment are independent textual
  states, with pressed/disabled controls and associated reasons. Incomplete metadata is unknown,
  not "not contracted", and exposes catalogue reload.
- Existing non-editable/unknown assignments remain selected and are included in the edit payload.
  They count toward the minimum-one-module rule; a truly empty selection remains blocked with a
  specific explanation. Existing compatible tabs on preserved modules remain in the payload.
- New grants still require the server's current company eligibility and actor ceiling. Root does
  not enable entitlements, assignment switches or lifecycle. A retained grant explicitly does not
  imply effective access when its company/module gates are disabled.
- Catalogue reload and rejected writes retain organization, role and draft choices. New module
  selection applies permitted tab defaults only to that newly selected module, without restoring
  tabs deliberately removed from another selected module.
- Stable error codes separate empty selection, unknown module, company availability, assignability
  and missing/unknown/unowned/incompatible/outside-ceiling tab permissions. No module/tab identifier
  lists or raw database details are added to responses.
- `actor_role` reflects the Users owner's effective company role (Root is normalized to Super Admin
  in this owner). Existing membership precedence, authorized delegated workspace fallback, routes,
  CSRF, session authority, tenant/organization guards, last-administrator protection, transactions,
  audit, seat coordination and explicit kiosk grants remain intact. There is no arbitrary company
  chooser, new authorization engine, migration, automatic activation or broader delegation.

## Files, structure and responsibilities

All frontend production changes remain under `react/src/app`; no dormant module scaffold was used.

| Area | Modified or created files | Responsibility |
| --- | --- | --- |
| Users UI/state | `react/src/app/BasicModules/Dashboard/Users/Users.tsx` | Company role, complete catalogue, retained draft/payload, validation and reload wiring |
| Shared picker | `react/src/app/BasicModules/Dashboard/Users/UsersTabPermissionPicker.tsx` | Independent accessible states, disabled reasons, prior assignments and retry |
| Selection policy (new) | `react/src/app/BasicModules/Dashboard/Users/usersModuleAccess.ts` | Pure presentation/selection/preservation policy, no authority or network access |
| Localized copy (new) | `react/src/app/BasicModules/Dashboard/Users/usersModuleAccessCopy.ts` | English, Spanish, French, Portuguese, Korean and Chinese feedback |
| Picker/API metadata | `react/src/app/BasicModules/Dashboard/Users/usersTabPermissionAssignments.ts`; `react/src/app/api/configCenter.ts` | Additive eligibility and role fields |
| Backend registry | `src/main/java/com/indice/erp/configcenter/users/ConfigCenterModuleAccessRegistry.java` | Company/actor states, current new-grant validation and grandfathering |
| Backend validation | `ConfigCenterTabPermissionAccess.java`; `ConfigCenterUserMutationGuard.java` in the same package | Stable module/tab validation codes; existing ceilings preserved |
| Backend role projection | `ConfigCenterUserAccessUseCases.java` in the same package | Additive effective actor role; role resolution unchanged |
| Frontend tests | `react/tests/users-module-access.test.mjs` (new); `users-access-regression.test.mjs`; `users-permissions-browser.mjs`; `react/package.json` | Executable selection cases, shared flow/browser regressions and test command |
| Backend tests | `src/test/java/com/indice/erp/configcenter/ConfigCenterServiceTest.java`; `users/ConfigCenterTabPermissionAccessTest.java`; `users/UsersFlowControllerTest.java`; `users/UsersFlowPersistenceTest.java` | Actual SQL mapping, error contracts, persistence, roles and isolation |
| Contracts | Frontend OS v2; Backend OS v1; `docs/users-module-tab-scope-standard-2026-08-02.md` | Adopted behavior and compatibility details |

State remains in the existing actor-keyed Users editor and its existing React hooks; no new global
store or modal system was introduced. The small pure policy and copy exports remove duplicated
selection decisions and are reusable by the two local entry flows, without becoming a new shared
business owner. Both modals retain their existing frame/wizard classification and blue styling;
this change does not standardize unrelated modals. Export/download behavior: N/A.

## Verification

- **Backend:** 156 tests in 15 relevant classes passed with zero failures/errors/skips, including
  19 persistence cases and 12 controller cases. Coverage includes Root/Admin/user roles, active
  membership precedence over a privileged supplied session role, the existing authorized delegated
  workspace contract, available/no-entitlement companies, prior inactive assignments, prohibited
  new grants, assignment switch, lifecycle, inactive entitlements, unknown module, genuinely empty
  input, tab errors, cross-company target/entitlement rejection, CSRF, expected-actor races and
  ordinary session/delegated-authority regressions. Backend compilation passed as part of this run.
- **Database:** a new disposable, loopback-only MySQL 8.4 container, `indice-users-access-isolated`,
  port 13329, database `indice_test_db`, was created for integration checks and removed afterward. Fresh Flyway startup
  and migration uniqueness passed. No test targeted the functional or production database. No
  migration was added or changed.
- **Frontend:** `npm run test:users --prefix react`: 22 cases passed. Executable policy tests cover
  independent flags, unknown metadata, missing prior rows, minimum count, forbidden new selections,
  deliberate removal of editable modules and retention of locked grants.
- **Browser:** `npm run test:users-permissions-browser --prefix react` passed in headless installed
  Chrome with synthetic intercepted APIs. It exercises actual create/edit components, disabled and
  unknown prior grants, retry without draft loss, distinct server errors, role projection mismatch,
  truly empty edit, exact kiosk payloads, retained tabs, failed/successful saves, invitations, stale
  account/company responses, permissions and CSRF request headers. Viewports 320/390/844/1440,
  dark mode and eight locale variants fit; no runtime errors. Screenshots were inspected locally.
- **TypeScript:** `npm run typecheck --prefix react` passed.
- **Production build:** `npm run build --prefix react` passed. Existing Vite large-chunk warnings
  remain; no chunking rewrite was included.
- **Diff:** `git diff --check` passed.

An initial integration attempt against the existing **test** database stopped before executing
cases because its historical Flyway checksums differed. No `repair`, checksum rewrite or validation
bypass was used; the checks were rerun against the fresh disposable database above. The initial
browser launch lacked Playwright's downloaded Chromium; installed Chrome was used. A later
navigation timed out while compilation/typecheck were competing for resources; the complete browser
flow passed on rerun. These are recorded separately from final passing checks.

## Review limits and handoff

Local fix and regression evidence are ready for review. No production mutation, deployment,
subscription change, user edit or permission grant was performed. The exact production incident
remains unconfirmed until its original failing response is available; the generic previous warning
alone cannot distinguish eligibility from tab/role validation. The server remains authoritative
at save time, so catalogue changes or concurrent access revocation can still reject a draft with a
specific recoverable message. Changes must be reviewed together for the new additive catalogue
metadata; missing metadata safely blocks new selections while preserving prior assignments.
