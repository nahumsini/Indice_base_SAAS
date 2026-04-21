# Spring Backend Docs

Read these files in order:

1. [`setup.md`](setup.md)
2. [`flyway.md`](flyway.md)
3. [`architecture.md`](architecture.md)
4. [`api-guide.md`](api-guide.md)
5. [`api-reference.md`](api-reference.md)
6. [`frontend-integration.md`](frontend-integration.md)
7. [`postman.md`](postman.md)
8. [`troubleshooting.md`](troubleshooting.md)

This documentation reflects the current standalone Spring backend contract.

Important:

- frontend-facing APIs are now `/api/v1/...`
- the React frontend no longer depends on PHP-style routes
- old compatibility controllers have been removed
- Flyway is now enabled in transitional baseline mode for the existing shared schema
