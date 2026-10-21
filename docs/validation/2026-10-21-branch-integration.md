# Integración de trabajo local y auditoría de despliegues — 2026-10-21

Estado: verificación de integración del repositorio. No autoriza ni ejecuta un despliegue.

El usuario solicita cerrar `codex/continuacion-20261016`, conservar el trabajo más reciente
en `main` y abrir una rama nueva para continuar. Antes de integrar, `HEAD`, `main`,
`origin/main` y la rama remota de trabajo apuntaban a `61e3acc4` después de `git fetch origin`.
Había 80 archivos modificados y 57 nuevos, ninguno preparado para commit.

## Despliegues y recuperación

Se revisaron los registros de activación del 19 y 20 de octubre, sus revisiones Git y las
ramas locales/remotas. La última aplicación documentada y `main` tenían árboles idénticos
en backend, frontend, recursos y MCP; los commits posteriores eran documentación.

| Revisión | Propósito | Resultado antes de integrar |
| --- | --- | --- |
| `aaa23d66ac73` | Hotfix de asistencia | Incluida en `origin/main` |
| `04f127a9a96e` | Workspace personal y calendario | Incluida en `origin/main` |
| `23d5b954a2b9` | Workspace creativo y corrección del SDK MCP | Incluida en `origin/main` |
| `0c2f6a150dbb` | Corrección de caché de cambios en recuperación | Parche equivalente incluido como `3df8e17dd380`, comprobado con `git cherry` |
| `6199eb2a763e` | Recuperación compatible con V334 | Variante de rollback conservada por separado |
| `720ed2d06466` | Recuperación compatible con V339 | Variante de rollback; V335–V339 ya son idénticas en `main` |
| `16917ace77c6` | Lectores creativos compatibles y escrituras temporalmente bloqueadas | Variante de rollback; rama publicada en remoto durante esta auditoría |

El [CI de la revisión desplegada](https://github.com/nahumsini/Indice_base_SAAS/actions/runs/39535620240)
se consultó mediante la API de GitHub y figura completado correctamente para `23d5b954`.
Las variantes de recuperación no se fusionan: retirarían funciones actuales o bloquearían
escrituras. Se preservan sus ramas y los registros de recuperación existentes.

Esta auditoría verifica el historial y la evidencia guardada. No inspecciona de nuevo los
contenedores productivos ni afirma que el trabajo local nuevo ya esté desplegado.

## Trabajo local incorporado

- Correo: acciones masivas, destinatarios y plantillas de Ventas, edición enriquecida,
  firma privada por cuenta y validación de adjuntos Office.
- Pizarrones: gestión, papelera recuperable y permisos de consulta/copia de proyectos.
- Agenda: directorios propietarios de RH/Inventarios/Ventas, ventanas de servicio,
  descansos, captura de clientes y configuración guiada.
- Juntas: asistencia real, disponibilidad y votaciones ponderadas con evidencia cerrada.
- Contratos de los cuatro dominios, normas canónicas y regresiones relacionadas.
- Revisión bilingüe del Modo aprendiz para proyectos, buzón, juntas y configuración/clientes
  de Agenda; versiones de esos capítulos incrementadas y catálogo generado `2026-10-21.v1`.
  El gate de vigencia detectó el digest anterior durante la suite frontend y se corrigieron
  las instrucciones, la matriz y el recurso generado, conservando los capítulos no afectados.
- V340–V344 se incorporan sin modificar migraciones anteriores.
- El CI incluye las regresiones nuevas de estos dominios y los scripts existentes de
  Agenda y Juntas, que antes no estaban invocados en su paso de frontend.

Los seis PNG de `artifacts/email-daily/` son evidencia de fixtures sintéticos; el HTML
`output/visualizations/funneling-unificado.html` es un prototipo, no una pantalla productiva.
Se conservan como artefactos separados del código de aplicación.

Se mantienen las fronteras por empresa/usuario, autorización del backend, CSRF,
contratos de módulos y migraciones forward-only descritos por sus propietarios.
No se cambian precios, banderas productivas, proveedores ni configuración de despliegue.

## Verificación de esta integración

- TypeScript: PASS.
- Build frontend: PASS; advertencia de bundles superiores a 600 kB.
- Regresiones frontend de los cuatro dominios: 59 PASS.
- Regresiones adicionales de Agenda y pizarrones: 73 PASS.
- Los 32 comandos del paso completo de regresiones frontend del CI: PASS; reportan
  1,003 pruebas, además de la validación de teléfonos y la vigencia del catálogo.
- Build MCP y sus 159 regresiones: PASS.
- `git diff --check`: PASS.
- Revisión acotada de patrones de credenciales en archivos cambiados/nuevos: sin coincidencias;
  no constituye una certificación de seguridad.
- Backend focalizado y Flyway: 138 PASS, cero fallos/errores; arranque desde esquema vacío
  hasta V344 y unicidad de migraciones correctos. La ejecución incluye compilación Java
  de producción y pruebas.
- Recuperación de despliegue: 16 PASS.
- Suite backend completa: 3,877 pruebas, cero fallos/errores y una omisión preexistente
  (`ReleasedSchemaUpgradeIntegrationTest`, condición previa de su ensayo V289 no satisfecha).
  Se ejecutó en la misma instancia desechable.
- Pruebas de aprendizaje contra el recurso generado final: 17 PASS, cero fallos/errores,
  ejecutadas después de la suite completa porque el catálogo se actualizó mientras ésta
  ya estaba compilándose.

El primer intento de backend encontró checksums históricos incompatibles (V230/V231/V232/V238)
en la base de pruebas previamente existente del puerto 3307. No se ejecutó `repair` ni se
modificó su historial. La repetición usa únicamente `indice_test_db` en un contenedor nuevo
`indice-close-tests-20261021`, expuesto por loopback en 13307, con credenciales sintéticas.
El primer intento de frontend se invocó desde la raíz y produjo errores de rutas relativas;
la ejecución correcta desde `react/` pasó las 59 pruebas.

La integración Git no implica validación visual humana de todos los módulos ni una nueva
liberación pública. Los gates productivos y el rollback del próximo despliegue siguen pendientes.

## Cierre Git

El trabajo se conserva en commits separados por dominio, artefactos, aprendizaje y CI/estándares.
El destino es `main` y la nueva rama `codex/continuacion-20261021`, ambas publicadas desde la
misma revisión final. La rama de trabajo anterior se retira después de comprobar esa igualdad.
Las ramas de recuperación y los cuatro stashes históricos se conservan.
Sólo existe un workflow de CI: publicar estas referencias no despliega producción.
La ejecución remota completa, incluidas imágenes y smoke de contenedores de CI, se inicia
con el push; las verificaciones locales anteriores no se presentan como ese resultado remoto.
