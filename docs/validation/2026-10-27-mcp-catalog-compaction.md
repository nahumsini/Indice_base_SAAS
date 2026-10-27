# MCP real-client follow-up and catalog encoding — 2026-10-27

Status: LOCAL CORRECTION; NOT DEPLOYED; REAL CHATGPT IMPORT FAILED ON `12593ec9`.

## Actual client evidence

After the owner personally reviewed and completed OAuth consent, ChatGPT renewed
its existing Indice connection. Authenticated initialization/capability validation
succeeded. Its first discovery attempt returned fifteen successful `tools/list`
pages from 23:43:58.673Z through 23:44:20.180Z. The refreshed Settings page removed
the authentication warning and offered Update tools. One normal Update tools
attempt then returned fifteen successful pages from 23:46:56.503Z through
23:47:20.007Z. Neither attempt requested the remaining four pages. All discovery
responses were HTTP 200; the process stayed ready with zero restarts. The intended
plugin still showed no available tools and Settings reported that the application
could not be updated. No business tool call occurred.

This establishes failed real-client import despite accepted authentication.
Pagination alone did not resolve the reported problem. The internal OpenAI failure
reason is unavailable. Fifteen pages, 480 descriptors and roughly 10 MiB of
cumulative metadata are observations, not proof of a documented platform limit.
No credential, grant or consent was changed by the agent. No retry loop, duplicate
connection or additional production deployment was performed.

The `12593ec9` one-attempt deployment authority remains closed; Stripe TEST-key
revocation remains HIGH and unresolved. This read-only follow-up does not reopen it.

## Local correction and preserved behavior

HTTP discovery now encodes repeated schema subtrees as standard local
`definitions`/`$ref` references, following the
[JSON Schema reference contract](https://json-schema.org/understanding-json-schema/structuring).
Registered validators and complete input/output constraints are unchanged. Existing
reference bases, anchors, definitions and nested dialects are left untouched.
Enum/const/default/example objects are data and are never rewritten.

Pages hold up to 64 authorized tools. All 608 named operations, annotations, OAuth
metadata, current per-request authorization, cursor validation, invocation and
confirmation behavior remain available. Stdio, backend, frontend, schema and
dependencies are unchanged. A page still fits the 4 MiB repository guard, and the
current entire catalog must fit 8 MiB and ten HTTP discovery round trips. These
are conservative local regression budgets, not claims about OpenAI limits.

## Verification

The strengthened full-catalog HTTP regression failed before the correction because
the aggregate metadata exceeded its budget. After the correction it traverses all
608 tools in ten pages: **7,847,028 total JSON bytes**, largest page **1,293,286**
bytes. It independently resolves every generated reference and deep-compares the
complete descriptors with actual SDK registration, then performs a synthetic
business-context read. SDK parsing and output validation run through the actual
HTTP transport.

Three focused schema regressions additionally pass: independent SDK/AJV acceptance
and rejection of nested required fields, positive money/precision/currency limits,
confirmation patterns and extra-property constraints; preserved existing reference
scopes; and untouched schema-shaped literal data. No registered schema is mutated.

Complete MCP regression: **178 tests PASS**, zero failures/skips, with TypeScript
compilation; 96.449 seconds. Frontend/backend/schema changes and their local build
requirements: N/A. Release preparation remains pending. This local result does
not establish successful ChatGPT import. A new production activation requires its
own exact-source release checks and applicable owner authority.
