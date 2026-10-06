# Lupita and platform administrator integration

Status: local integration correction; deployment acceptance remains separate.
Date: 2026-10-06. Owners: MCP, deployment and each existing domain owner.

Source parents are administrator `124795f204f2c619be18807d0cebc3fc5f54227a` and
Lupita `39e4ed438155cb40ab642b3247b1c94eb5ae6e9e`. Both uploaded Lupita branch
names point to the same commit. A three-way merge retains the administrator UX,
commercial analytics, released schema lineage, dependency hardening and deployment
recovery instead of replacing them with the incoming branch's older base.

## Published schema authority

Read-only inspection on 2026-10-06 confirmed APPTEST at V293 and production at V289,
both with zero failed migrations. APPTEST's published V293 is opportunity flow
assignment, checksum `-736416289`; it is not staged-file intake.
Published V288/V289/V291/V292 and V293 must remain byte-identical.

The incoming staged-file V293 conflicts with that published identity. V294–V298
have no SQL dependency on staged-file intake and are not applied on either target.
Move only the incoming, unpublished staged-file migration to the next unused
version, **V299**, without changing its SQL. Preserve V294–V298 and their ordering.
Do not repair history, edit an applied migration or reset a release database.
Historical incoming validation reports refer to their original branch's V293–V298;
they do not prove acceptance of the merged V294–V299 lineage.

The migration uniqueness regression pins all five currently published identities.
The explicit fresh, disposable upgrade rehearsal first verifies V289 → V293 and
then V293 → V299, preserving Flyway history and synthetic administrator records.
Normal backend tests must also use an isolated database.

## Release boundaries

This merge adds HR/Processes and Inventory/Sales/POS assistant operations, files
and reports. Existing OAuth grants do not gain scopes. Provider activation,
merchant credentials, subscription prices and billing authority must not change
as a consequence of integration. Stripe remains pending as requested; the earlier
administrator-only exception is not a general waiver for new assistant features.

The previous administrator CI, scans, APPTEST smoke and canary do not certify this
merged artifact. Exact-commit tests/CI, scans, fresh backups and restore/rollback
rehearsal, protected-environment preflight and synthetic APPTEST acceptance are
required. The previous recovery artifact has not been certified for V299.
Real ChatGPT OAuth, refresh/revocation, file handling and 20–30 minute continuity
remain acceptance gates; merchant/hardware gates apply before provider activation.
No new production deployment is recorded or certified by this decision.

## Local verification

- Fresh isolated MySQL 8 on loopback 3334, database `indice_test_db`: upgrade,
  published-checksum/uniqueness and dependency/MVC exposure regressions, 6 passed.
- MCP TypeScript/build and full suite: 145 passed. The updated SDK catalog
  regression was rerun: 8 passed, retaining 459 unique names, 158 action pairs,
  141 reads and both temporary intake tools. This is not real ChatGPT acceptance.
- React TypeScript and production build passed; selected administrator/localization,
  release-dependency, consent, Sales and POS regressions: 271 passed.
- Host-network recovery regressions: 16 passed; shell syntax and learning-catalog
  generation check passed. No VPS activation was executed.
- Production-dependency npm audits for React and MCP: zero reported vulnerabilities;
  staged integration secret scan: zero findings. Image/backend SCA remains separate.
- Full backend suite and exact-commit merged CI still require their own results.

Existing frontend chunk-size, Java deprecated/unchecked API and Node TypeScript
stripping warnings remain. No functional local, APPTEST or production data is used
by these tests.
