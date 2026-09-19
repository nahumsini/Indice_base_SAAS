# Integración de KPIs y presentación pública

Fecha: 2026-09-19. Evidencia de integración y validación local; este documento no
certifica un despliegue.

## Alcance

Se integró `codex/basic-kpi-integration-2026-09-16`, commit
`a55bfb0e4e8f1f5e144f8184c886064c5ccb803c`, sobre `main`
`53dd6e83a0046f822c6485af30185db806e6486b`. Incluye mediciones de los KPIs
básicos, fuentes autoritativas del panel ejecutivo y las rutas públicas estáticas
`/investment` y `/Mrcarlosmunoz`.

El único conflicto fue la introducción de `KPI_TAB_STANDARD.md`: se conservó el
seguimiento por módulo de `main`, se añadió el contrato de Ventas y se incorporó
el límite de las fórmulas de Recursos Humanos. Los contratos nuevos están enlazados
en el mapa documental.

No se añadieron ni modificaron migraciones, dependencias fijadas, configuración de
despliegue ni el servicio MCP respecto al `main` de partida. Se preservaron los
trabajos locales ya integrados y los archivos no versionados del directorio
`output/`.

## Verificación del árbol integrado

- Frontend: 42 pruebas enfocadas, seguidas de las 802 pruebas de `tests/*.test.mjs`,
  todas aprobadas. Las enfocadas son un subconjunto de la suite completa.
- Localización complementaria: 40 pruebas aprobadas, con solapamiento con la suite
  anterior; validación telefónica aprobada.
- TypeScript y build Vite aprobados. Persiste el aviso de chunks mayores de 600 kB.
- Backend: 37 pruebas enfocadas aprobadas; suite completa de 2.466 pruebas en 453
  clases, sin fallos, errores ni omisiones. Incluye unicidad y arranque de las 276
  migraciones Flyway. MySQL de pruebas aislado en el puerto 13327, sin usar la base
  funcional ni producción.
- MCP: 27 pruebas aprobadas. Sintaxis de scripts y Compose validados; la variante
  staging se validó sin interpolación, conforme al preflight para host-network.
- Chrome sobre el build de producción: ocho idiomas, siete pestañas, ruta
  personalizada de ocho pestañas, anchos 320/390/768/1440, menús, teclado, historial,
  recarga y tema oscuro. Cero excepciones, solicitudes API o errores de recursos.
- `git diff --cached --check` aprobado.

Los logs locales usan el prefijo `/private/tmp/indice-kpi-`. Las capturas y el
resultado de Chrome están en `.run/investment-review/` del worktree temporal
`/private/tmp/indice-kpi-release-20260919/source`; no se versionaron.

## Límites de entrega

El despliegue requiere identificar el ambiente, CI del commit exacto y completar
el preflight real, revisión de artefactos, respaldo, restauración y verificación
descritos en el runbook. La consulta del servidor encontró producción todavía en
`e26442a51fac`; esa consulta fue de solo lectura.

Publicar la SPA en `app.indiceapp.com` no configura por sí solo las rutas del
dominio raíz `indiceapp.com`. El contrato de presentación pública mantiene esa
diferencia explícita.
