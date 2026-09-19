# Integración local de ramas — 2026-09-19

Estado: integración y validación local; no constituye publicación ni despliegue.

## Fuentes y recuperación

- Rama de trabajo: `integration/local-2026-09-19`.
- Main integrado: `origin/main`, commit `2f66742d`.
- Avances recientes: `origin/codex/indice-next-iteration-2026-09-14`, commit `1d6a31dc`.
- Respaldo del trabajo local: `backup/local-before-sync-2026-09-19`, commit `673f9da9`.
- Integración de main: `02242c91`; integración de nómina y kioscos: `79c3d065`.

Los tres historiales son ancestros de la integración. La rama original
`release/2026-09-11-finance-corrections` conserva su commit anterior, `f44b4ec8`.
El respaldo registra los 156 archivos de código y documentación que tenían cambios
locales. Los tres artefactos de `output/` permanecen fuera de Git y sin modificaciones.
También se guardó una copia temporal local de archivos, parches y hashes antes de integrar.

## Resolución y comportamiento

Main incorpora los avances de administración de clientes, KPIs, identidad visual,
notificaciones, barra de trabajo, aprendizaje y moneda. La rama reciente incorpora
integridad de nómina, tiempos de inactividad por canal de kiosco y selección de
impuestos configurados en ventas en ruta.

Los únicos conflictos fueron documentales:

- `docs/KPI_TAB_STANDARD.md`: se conservan los contratos y la distinción local entre
  adopción, verificación y despliegue.
- `docs/README.md`: se conserva la reorganización local y sus referencias.
- `docs/indice-frontend-operating-system-v2.md`: se elimina un bloque duplicado de
  KPIs y administración de clientes, conservando las reglas de ambos historiales.

La integración no necesitó resolver conflictos de código ni introducir reglas de
negocio adicionales. Conserva las correcciones financieras liberadas y los avances
locales de KPIs y administración. No cambia migraciones respecto al respaldo.

## Verificación

- TypeScript: PASS.
- Build Vite: PASS.
- Regresión frontend: 753 pruebas, sin fallos.
- Localización adicional bajo `react/src/app`: 12 pruebas, sin fallos.
- Validación telefónica: PASS, incluidas 23 aserciones positivas, 6 negativas y prefijos.
- Backend focalizado: 77 pruebas de 9 clases, sin fallos.
- Backend completo: 2.455 pruebas de 451 clases, sin fallos, errores ni omisiones.
- Compilación limpia y arranque Flyway: PASS; esquema V276, sin migraciones pendientes.
- MySQL de pruebas desechable en `127.0.0.1:13327/indice_test_db`; no se utilizó la base funcional.
- Diff de integración desde el respaldo: `git diff --check` sin hallazgos.
- Conflictos pendientes y marcadores de conflicto: ninguno.
- Enlaces locales de los tres documentos resueltos: válidos.

Las pruebas focalizadas forman parte de los totales amplios; no se suman otra vez.
El build conserva la advertencia de algunos bundles mayores a 600 kB. No se realizó
revisión visual autenticada en navegador. El respaldo conserva espacios finales
preexistentes en dos documentos históricos; no fueron introducidos al resolver la integración.

Publicación en GitHub, despliegue y cambios de datos funcionales: N/A.
