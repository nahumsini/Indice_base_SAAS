# Administrative release dependency triage — 2026-10-06

Scope: the administrative UX/commercial analytics candidate and its V293-compatible
application recovery backend. This is applicability and remediation evidence, not
a security certification or a waiver of other release gates.

## Patched dependencies

- `proxy-addr` 2.0.8 in the MCP lock/override closes CVE-2026-90711. The
  existing delegated bearer/backend grant boundary and `trust proxy=false` remain
  unchanged. Two focused regressions cover the package fix and application policy.
- `commons-lang3` 3.18.0 closes CVE-2025-48924; `log4j-api` 2.25.5 closes
  CVE-2026-49844 through the existing Boot-managed version properties. No logging
  backend, Spring major, ORM, or business authority changes.
- Frontend `fflate` 0.8.3 closes CVE-2026-45820 and the DOMPurify 3.4.16 override
  closes GHSA-6688-9rhm-gjv2 and GHSA-p98j-92pf-mc4p. A lock and ZIP/PDF generation
  regression protects the catalog download/document compatibility boundary.
- Both backend sources have a resolved-runtime version regression. The exact
  artifacts must be rescanned and retain their SBOM before activation; source pins
  alone are not a passing image scan.

Primary remediation references: [MCP package advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h),
[Apache Commons notice](https://lists.apache.org/thread/bgv0lpswokgol11tloxnjfzdl7yrc1g1),
[Apache Log4j notice](https://logging.apache.org/security.html#CVE-2026-49844),
[fflate release](https://github.com/101arrowz/fflate/releases/tag/v0.8.3), and the
[DOMPurify root removal](https://github.com/cure53/DOMPurify/security/advisories/GHSA-6688-9rhm-gjv2)
and [hook removal](https://github.com/cure53/DOMPurify/security/advisories/GHSA-p98j-92pf-mc4p) advisories.

## Spring MVC CVE-2026-47884 — application preconditions absent

Trivy reports CRITICAL against the installed `spring-webmvc` 6.2.19. The
[Spring advisory](https://spring.io/security/cve-2026-47884/) assigns MEDIUM and
requires XSLT rendering plus implicit view-name resolution from a wildcard handler.
The framework dependency is **not patched** by this release.

Application applicability is `N/A` for these exact candidate/recovery runtimes:

1. Source inspection finds no XSLT view/resolver configuration or implicit wildcard
   view controller.
2. `MvcViewExposureRegressionTest` loads the application context, asserts there
   are no `XsltView`/`XsltViewResolver` beans, and checks that every `/**` mapped
   handler uses `@ResponseBody`. Both source variants run this test in their full
   suites; the assertion prevents a future MVC-view addition silently invalidating
   this conclusion.
3. The release keeps the Boot 3.5/Spring 6.2 architecture. A Spring 7 migration is
   not part of an administrator deployment.

Do not suppress the scanner finding or describe the library as fixed. Re-evaluate
this bounded conclusion before introducing MVC/XSLT views, changing wildcard
handlers, or altering the affected Spring configuration. Release records must link
the exact green tests, artifact identifiers, and retained scan result.

## Deliberately separate finding

The historical Stripe TEST-secret finding remains unresolved under the owner's
[narrow, expiring deferral](2026-10-06-admin-release-stripe-deferral.md). Nothing in
this dependency record closes that finding or authorizes Stripe activation.
