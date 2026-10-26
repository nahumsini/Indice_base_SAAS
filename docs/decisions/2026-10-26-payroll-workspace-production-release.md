# Complete local workspace and payroll: production release cut

Date: 2026-10-26.

The owner asks to push and deploy all current work in the primary local checkout,
including changes created in other conversations. The existing production-only
preference continues; App Test is not a deployment target. Other worktrees are
outside this captured primary-folder scope, consistent with the earlier explicit
choice not to integrate the separate WhatsApp checkout.

Application source: `30f3552f9d697c331869c80bdaed1d1aeb4026f7`, on
`codex/next-work-20261025`. The initial 74 changed/untracked paths are retained,
along with the existing Mexico payroll and 5S commit. Release validation adds
reviewed learning content, frontend regressions, payroll warning-count correction
and updated integration fixtures. The complete runtime delta from production
`43394a04` spans 207 paths; it includes Canada/Mexico payroll and employee editing,
Ideas Board/5S/project presentation, Funneling prompts, guides and owner contracts.
Any changes made after this captured cut remain outside this immutable artifact.

V361–V365 are forward-only additions. The prior application recovery image keeps
all original archive entries and adds only these migration resources; it must be
rehearsed on an upgraded disconnected restore before activation. No migration
repair, historical checksum change or reverse migration is authorized. Business
records, approved payroll snapshots, tenant access, billing references, prices,
provider settings and App Test remain protected.

The Canada and Mexico owner contracts define bounded ordinary-pay calculations
and explicit approval holds. This release is not certification of all statutory
payroll cases, all state/provincial levies, CFDI/PAC, T4/RL-1 or remittance filing.
Operational and excluded payroll treatments retain their own behavior.

All exact-candidate technical gates remain required: CI, protected preflight,
source and image scans, complete backups and off-host verification, disconnected
restore, compatible recovery, dry run and post-activation observation. Engineering
fixtures do not replace the owner's product acceptance. No live mail, payroll
approval, provider activation or business-data test mutation is authorized by
this release exercise. Earlier closed Stripe TEST exceptions are not renewed by
this source decision; the unresolved historical key needs its own scoped decision.
