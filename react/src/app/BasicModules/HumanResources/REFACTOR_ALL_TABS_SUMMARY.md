# Refactor Human Resources: resumen operativo

## Alcance

Se aplico el estandar de refactor iniciado en Employees a las pestanas activas del modulo Human Resources, excepto Payroll/Nomina por solicitud expresa.

Pestanas cubiertas:

- Employees / Collaborators
- Attendance
- Control
- Announcements
- Assets
- Records
- Permissions
- Incentives
- KPIs

Pestanas fuera de alcance:

- Payroll / Nomina
- Comunicados legacy, porque la ruta activa del modulo usa Announcements
- Kiosk publico, porque no forma parte de las pestanas del modulo principal

## Resumen de cambios

El modulo quedo orientado a carga progresiva: la shell de Human Resources carga solo la pestana activa y los modales pesados se descargan bajo interaccion. Esto reduce el peso inicial sin cambiar contratos de backend ni el comportamiento esperado de las vistas.

Employees quedo como orquestador, con tabla, filtros, paginacion, seleccion, mutaciones, edicion inline, modales, feedback, constantes, tipos y utilidades extraidos por responsabilidad.

Announcements separo filtros, clases visuales y resumen inicial en `constants` y `utils`, y carga diferida de modal de creacion y configuracion de columnas.

Assets separo tipos y utilidades de dominio: columnas, formatos, clases, normalizadores, errores y mapping de filas. Sus modales de alta, detalle y columnas se cargan bajo demanda.

Attendance separo tipos de opciones y utilidades de fecha/ubicacion. El modal de registros se carga solo cuando se abre.

Control separo defaults, filtros, fechas, validadores de rango, helpers de horarios y errores en `utils/control.utils.ts`. Los dialogos administrativos y la libreria `qrcode` quedaron bajo demanda.

Records movio la generacion PDF a `utils/records.pdf.ts` con import dinamico de `jspdf`. Sus modales de creacion, detalle y columnas se cargan bajo demanda.

Permissions movio helpers de adjuntos a `utils/permissions.attachments.ts` y difiere modales de creacion, detalle y columnas.

Incentives difiere el modal de creacion y configuracion de columnas, manteniendo la pestana como orquestador de datos, filtros, seleccion y acciones.

KPIs difiere el componente compartido pesado `KPIsTab` y conserva una vista de carga alineada al modulo.

## Optimizacion de bundle

- `App` privado se carga con `lazy` desde rutas.
- Vite separa vendors por familia para evitar un bundle inicial monolitico.
- `country-state-city` ya no entra como import estatico funcional en el flujo principal.
- `profileCountries` usa un catalogo liviano basado en `libphonenumber-js`.
- Estados se cargan bajo demanda; ciudades quedan como campo libre para evitar empacar datasets masivos.
- `jspdf` y `qrcode` quedan en chunks diferidos.

## Verificacion ejecutada

- `npm run typecheck`
- `npm run build`
- `curl -I http://localhost:5174/dashboard`

Resultado: TypeScript sin errores, build de produccion exitoso y ruta local respondiendo `200 OK`.

## Prompt reutilizable

```text
Necesito aplicar el estandar final de refactor de Human Resources a la pestana [NOMBRE_DE_PESTANA], siguiendo el patron usado en Employees y extendido al resto del modulo.

Objetivo:
Dejar la pestana como una version final, funcional, mantenible, con carga progresiva, traducciones tipadas y responsabilidades claras, sin cambiar contratos de backend ni romper comportamiento existente.

Reglas de ejecucion:
1. Analiza primero la pestana activa, sus componentes, hooks, utils, tipos, traducciones, modales, tablas, formularios, dependencias pesadas y flujo de datos.
2. Mantiene el archivo principal como orquestador de experiencia: datos, estado de alto nivel, handlers y composicion.
3. Extrae UI repetible a componentes enfocados.
4. Extrae estado complejo y efectos a hooks por dominio cuando reduzca complejidad real.
5. Extrae constantes, tipos, adaptadores, payloads, validaciones, formatos y helpers a archivos dedicados.
6. Mantiene todos los textos en traducciones existentes y valida locales con tipos `satisfies` cuando aplique.
7. Carga bajo demanda modales, paneles pesados y librerias usadas solo por interaccion.
8. Evita imports estaticos de datasets grandes o librerias pesadas dentro del bundle inicial.
9. Conserva diseno operativo: denso, escaneable, responsivo, accesible y consistente con Human Resources.
10. No redisenes de forma decorativa ni crees landing pages.
11. No toques Payroll/Nomina salvo instruccion explicita.
12. No reviertas cambios ajenos.
13. Verifica con `npm run typecheck`, `npm run build` y prueba local de ruta.

Checklist final:
- TypeScript sin errores.
- Build de produccion exitoso.
- Traducciones tipadas y funcionando.
- Ruta local responde.
- Modales y paneles pesados en imports diferidos.
- Sin imports estaticos innecesarios de datasets/librerias pesadas.
- Componentes, hooks y utils con responsabilidades claras.
- Contratos de API intactos.
```
