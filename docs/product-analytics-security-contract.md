# Product Analytics Security Contract

Status: active domain contract for product-analytics endpoints

Owner: platform administration

## Endpoint classification

| Endpoint | Classification | Trust boundary | Data classification | Audit expectation |
| --- | --- | --- | --- | --- |
| `POST /api/v1/product-analytics/app/collect` | Authenticated browser mutation | Current server session plus CSRF; company and user come only from the authenticated session | Internal usage metadata | Correlated HTTP request log; no request body or session identifier in logs |
| `GET /api/v1/product-analytics/platform-dashboard` | Platform administration | Authenticated user with `PLATFORM_VIEW`; an optional company filter never grants authority | Internal aggregated product usage | Correlated HTTP request and platform access denial logs |
| `POST /api/v1/product-analytics/web/collect` | Public integration, disabled by default | Dedicated server-to-server ingest token | Anonymous website usage metadata | Rejected/accepted request metrics without token, visitor reference, or body contents |

## Public website ingestion release rule

`APP_PRODUCT_ANALYTICS_WEB_INGEST_TOKEN` is empty by default. In that state the public integration
returns `503` and is considered disabled. Production releases may ship the disabled endpoint.

Do not enable it until all of the following controls have current release evidence:

1. The website submits observations through a server-side connector. The token must never be
   embedded in HTML, JavaScript, a public repository, a URL, or browser storage.
2. The edge or connector enforces an approved per-source request limit and maximum request size.
3. Monitoring records aggregate accepted, rejected, throttled, and malformed request counts without
   recording the token, anonymous visitor reference, full URL, referrer path, or request body.
4. Token rotation and revocation are documented and tested in the target environment.
5. Negative tests cover missing/invalid tokens, oversize or malformed bodies, and rate-limit
   exhaustion.

Until those controls are certified, leave the token empty and show the website connector as
pending. Authenticated application analytics and the platform dashboard do not depend on this
public integration.

## Data minimization

- Application identity is derived from the authenticated session and is never accepted from the
  request body.
- Website visitors are stored only as a SHA-256 hash of a random anonymous reference.
- Routes and sections are normalized keys with bounded lengths; full URLs and page contents are not
  collected.
- Active time is accepted only in bounded increments and the daily aggregate is capped.
