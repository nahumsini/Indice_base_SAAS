# Backend DevTools Restart

Date: May 4, 2026

## Summary

Enabled Spring Boot DevTools for local backend development.

This gives the backend automatic restart-on-change behavior when running through Maven and Java classes are recompiled.

## What Changed

- Added `spring-boot-devtools` as an optional runtime dependency.
- Documented the local development command:
  - `./mvnw spring-boot:run`
  - `./mvnw spring-boot:run -Pminio`
- Documented that Java changes restart after classes are recompiled.
- Noted the manual compile trigger for editors without compile-on-save:
  - `./mvnw -q -DskipTests compile`

## Files Changed Or Involved

- `pom.xml`
- `README.md`
- `docs/March/30th/setup.md`

## Verification

Completed checks:

- `./mvnw -q -DskipTests compile`
- `git diff --check`
