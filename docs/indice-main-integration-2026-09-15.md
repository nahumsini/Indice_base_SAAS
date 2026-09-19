# Integración de avances a main — 2026-09-15

## Alcance

Integración para control de versiones; no constituye un despliegue de producción.
Conserva `origin/main` en `a8652bc1`, la integración liberada `35755967` y la
corrección de pagos parciales `f44b4ec8`. El trabajo se preparó en un checkout
separado para conservar los archivos de trabajo y los servidores locales activos.

Se incorporan los avances aprobados del administrador de plataforma y las pestañas
de KPIs de Recursos Humanos, Procesos y Tareas, Gastos, Caja chica y Cartera, junto
con sus contratos, traducciones y regresiones. Se conservan permisos de mutación,
reglas financieras, aislamiento por empresa/unidad/negocio y los cambios de interfaz
ya existentes en main.

Áreas de archivos: `react/src/app/PlatformAdmin`, `react/src/app/BasicModules`,
componentes compartidos de navegación, catálogos de acceso, servicios backend de
plataforma/finanzas/KPIs/procesos, pruebas y documentación canónica. No se incluyen
prototipos `output/`, dependencias instaladas, secretos ni datos de las bases locales.

## Verificación de la integración

- TypeScript y build de frontend: PASS.
- Los 26 comandos de regresión frontend definidos en CI: PASS; 732 casos reportados
  por los ejecutores TAP, además de la validación de teléfono del script correspondiente.
- 21 comprobaciones complementarias de identidad, barra de trabajo, notificaciones,
  moneda y presentación de kioscos: PASS (incluyen cobertura compartida con CI).
- 145 pruebas backend de 17 clases: PASS; cubren servicios/controladores afectados,
  permisos, cálculos monetarios, cobranza y unicidad de versiones Flyway.
- Integración contra MySQL desechable `13323/indice_test_db`, sin usar bases funcionales.
- `git diff --check` y búsqueda de patrones de credenciales en los archivos preparados:
  sin hallazgos. Esta búsqueda no equivale a una certificación de seguridad.
- Una regresión del administrador esperaba únicamente las variantes `sections` y
  `workflow`: se actualizó para incluir `views`, conservando las verificaciones de
  teclado, selección y memoria de contexto. Su suite completa pasó después del ajuste.

Advertencia conocida: Vite informa algunos bundles grandes; el build finaliza bien.
La revisión visual autenticada sigue pendiente porque no hay navegador conectado.
Los límites de medición se documentan en los contratos específicos enlazados desde
`KPI_TAB_STANDARD.md`. La CI remota se inicia al subir; sus resultados no se anticipan
en este registro. Despliegue y rollback de infraestructura: N/A.
