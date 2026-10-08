# Entrega: Modo aprendiz compartido con MCP

Nota de integración 2026-10-08: las referencias V300 de este informe son históricas.
Aprendizaje usa V304 en la combinación de main, con SQL idéntico; consultar la
[decisión de migración](decisions/2026-10-08-learning-migration-integration.md).

Fecha: 2026-10-06. Rama: `codex/learning-mode-mcp-2026-10-06`.
Estado: implementación local verificada, despliegue pendiente.
Este informe registra evidencia de esta revisión; el comportamiento se gobierna por el
[contrato de aprendizaje](learning-mode-mcp-progress-contract-v1.md).

## Comportamiento entregado

- Currículo compartido de 58 capítulos en 10 módulos, con requisitos, operación y comprobación
  en español e inglés. Incluye los flujos actuales de RH, tareas, procesos, dinero, inventario,
  compras, ventas, POS, informes, conexiones de IA y comunicación con Soporte.
- Avance privado persistente por usuario, empresa, capítulo y versión. Reiniciar la presentación
  conserva la memoria; navegar a otra etapa no completa las anteriores.
- Dashboard con avance de seis etapas y continuación hacia la pestaña correspondiente.
- Acompañantes conectados al servidor; selección, expansión, casos y excepciones didácticas se
  guardan con el propietario existente de preferencias. Las respuestas de otro contexto se
  descartan y las declaraciones fallidas se pueden reintentar.
- Cuatro herramientas MCP nuevas: consultar avance, consultar próxima misión, preparar cambio y
  guardar cambio confirmado. `learning.manage` es un consentimiento adicional; la lectura anterior
  no permite escribir progreso.
- Aplicado deriva de commits compatibles y de 46 mutaciones web adoptadas explícitamente en
  14 controladores. El actor de la operación se captura en el propietario y se comprueba al
  proyectar su evidencia. Un fallo de esta proyección conserva el resultado empresarial.
- Generador y CI verifican cobertura de pestañas, contenido bilingüe, evidencia conocida y
  concordancia del catálogo con las pantallas y propietarios actuales.

## Comportamiento preservado

Se conservaron rutas, formas de respuesta, permisos, cálculos y persistencia del negocio de RH,
procesos, tareas, finanzas, ventas e inventario. Los controladores existentes solo adoptan la
proyección de aprendizaje y vinculan el actor que utilizan. Las preferencias existentes conservan
su contrato; la precondición de actor y la recuperación CSRF nueva se limitan a `learning-view-*`.

Se mantienen las seis etapas, la anatomía compacta de las guías, los títulos y acciones originales,
los nueve requisitos RH, los motivos de No aplica y los flujos operativos actuales. Panel Inicial
no agrega acompañante interno; POS/Venta permanece fuera de ese acompañante y del recorrido inicial.
No se incorporó consulta administrativa del avance ajeno ni se reutilizó la certificación de
consultores o distribuidores.

## Archivos y contratos

| Área | Archivos principales |
| --- | --- |
| Contenido compartido | `react/src/app/learningMode/curriculum.ts`, `curriculumControls.ts`, `scripts/generate-lupita-learning-catalog.mjs` |
| Backend privado | `src/main/java/com/indice/erp/learning/*`, `V300__private_learning_progress.sql` |
| MCP backend | `ai/learning/AiLearningProgressActionService.java`, `AiLearningProgressApiController.java`, contratos y autorización/capacidades existentes |
| MCP transporte | `integrations/indice-mcp/src/learningProgressTools.ts`, `learningTools.ts`, `indiceClient.ts`, catálogo, políticas e instrucciones |
| Web | API de aprendizaje, `learningProgressStore.ts`, hooks privados, acompañantes RH/modulares, Dashboard y navegación de `App.tsx` |
| Propietarios adoptados | Controladores RH, asistencia/acceso, tareas, proyectos, procesos, gastos, caja chica, cartera, recepción POS, compras y Sales |
| Preferencias y consentimiento | `workspace/UserWorkspaceState*`, API de preferencias web e Integraciones en es-MX/en-CA |
| Gates y documentación | `.github/workflows/ci.yml`, contratos canónicos adoptantes, catálogo generado y matriz de cobertura |

## Verificación ejecutada

| Verificación | Resultado |
| --- | --- |
| Backend: 13 clases enfocadas, incluyendo aislamiento, permisos, consentimiento, CSRF, evidencia, confirmación, expiración, replay y persistencia | 76 pruebas, 0 fallos/errores |
| MCP: suite de protocolo, autorizaciones, esquemas, HTTP y regresiones | 155 pruebas, 0 fallos/errores |
| MCP: repetición enfocada tras dar formato al archivo nuevo | 2 pruebas ya incluidas en las 155, correctas |
| Web: `test:learning-mode` | 30 pruebas, correctas |
| Web: `test:dashboard-ui` | 18 pruebas, correctas |
| TypeScript web y compilación MCP | Correctos |
| Build web | Correcto; advertencia de tamaño de chunks |
| Compilación backend | Correcta |
| Flyway desde base nueva y arranque Spring | Versión 300, sin pendientes ni fallos |
| Unicidad de versiones de migración | Correcta |
| `generate-lupita-learning-catalog.mjs --check` y `git diff --check` | Correctos |
| Cambios a cálculos financieros | N/A |
| Despliegue / comprobación en ChatGPT real | Pendiente; no forma parte de esta evidencia local |

Los 279 casos de las cuatro suites principales pasaron. Las pruebas de base de datos utilizaron
exclusivamente `indice_test_db` en una instancia desechable del puerto 13308, creada para esta tarea.
La instancia se detiene al terminar; conserva su esquema para reproducir la validación.

El primer intento utilizó la instancia aislada anterior del puerto 13307. Flyway detectó diferencias
de checksum en V288, V289 y V293 respecto a `main`. No se reparó esa base ni se editaron migraciones
aplicadas: la validación definitiva se realizó desde cero en 13308. Dos pruebas nuevas de capacidades
también requirieron corregir mocks que no contemplaban consultas a otras pestañas; después pasó la
suite completa. La compilación web necesitó acceso fuera del sandbox para la resolución normal de
esbuild. Ninguno de estos fallos permanece abierto en la revisión verificada.

## Operación y límites

1. Desplegar backend, web y MCP de la misma revisión, siguiendo el runbook del repositorio.
2. Verificar el historial/checksums de Flyway de la base destino y aplicar V300 mediante Flyway.
3. Para guardar avance desde el chat, autorizar `learning.manage`; las conexiones previas pueden
   consultar guías y avance con `learning.read`.
4. Solicitar capacitación, consultar guía y siguiente misión, confirmar Entendido y realizar un
   ejercicio con las acciones autorizadas de su módulo. El servidor reconoce Aplicado compatible.
5. Revisar las lecciones al cambiar funciones, incrementar su versión cuando corresponda y
   regenerar catálogo/matriz. CI detecta divergencias, pero la revisión semántica sigue siendo humana.

El avance entre dispositivos se consulta cada 30 segundos y al recuperar foco. Aplicado acredita
una operación compatible, no todos los requisitos de un capítulo ni una certificación. Una
proyección web fallida puede dejar esa práctica sin reflejar en el avance; no revierte el negocio.
Los módulos complementarios fuera de los diez adoptados no se declaran cubiertos.

Rollback: restaurar las tres imágenes previas y conservar las tablas aditivas de V300, sin migraciones
inversas ni borrado de progreso o auditoría. La prueba de una base nueva no sustituye la revisión de
checksums ni el smoke del ambiente que se desplegará.
