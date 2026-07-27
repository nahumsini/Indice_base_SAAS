# 9. Revisión módulo por módulo

Se revisaron los 20 módulos del catálogo (`react/src/app/config/moduleCatalog.ts`, que refleja la
tabla `modules` sembrada en `B1__spring_backend_baseline.sql:144-152`). Hallazgo principal: **solo
dos módulos tienen backend real hoy** (Config Center y Recursos Humanos); los otros 18 son
componentes de React de un solo archivo con estado local/datos de ejemplo, sin ninguna llamada a
`apiClient` (confirmado por grep de `apiClient|fetch(` en `BasicModules`, `ComplementaryModules` y
`AIModules` — cero resultados fuera de Dashboard y HumanResources).

Esto cambia el enfoque de esta revisión: no es "ajustar 20 módulos existentes a multi-tenant", es
"los 2 módulos reales deben quedar impecables, y los 18 restantes deben construirse **ya** siguiendo
el patrón multi-tenant desde el primer commit de su backend, para no repetir la deuda que hoy tienen
HR/Config Center" (roles inconsistentes, falta de FK, etc. — ver
[02](02-auditoria-estado-actual.md) y [08](08-seguridad-recomendaciones.md)).

## 9.1 La "receta" que todo módulo nuevo debe seguir

Antes de construir el backend de cualquiera de los 18 módulos pendientes, cada uno debe:

1. **Tabla(s) con `company_id NOT NULL`** desde la primera migración (no nullable — el error de
   `units`/`businesses` en el schema actual no debe repetirse, ver
   [03 §3.5](03-modelo-datos-multitenant.md)).
2. **FKs reales**, no columnas sueltas, para cualquier referencia a `unit_id`/`business_id`/`employee_id`/etc.
3. **Resolver el tenant desde `TenantContext`** ([04 §4.1](04-arquitectura-backend.md)), no
   reinventar el "obtener companyId de la sesión" en cada controlador nuevo.
4. **Anotar sus endpoints con `@RequiresModule("<slug>")`** ([04 §4.3](04-arquitectura-backend.md))
   desde el día uno — así el módulo nace ya respetando planes/entitlements, en vez de agregarlo
   después como parche.
5. **Agregar su fila real a `modules`** con el `tier` correcto y quedar cubierto por al menos un
   `plans` (ver [03](03-modelo-datos-multitenant.md)) antes de salir de beta — hoy varios módulos
   están sembrados como `tier = 'enterprise'` sin que eso signifique nada funcional; una vez activo
   el enforcement, si un módulo no está bien clasificado quedará inaccesible para todos los planes
   por accidente.
6. **Decidir explícitamente su nivel de scoping**: ¿el dato vive a nivel `company`, o necesita
   bajar a `unit`/`business` (ej. inventario físico, POS de una sucursal)? Ver columna "Scoping
   sugerido" en la tabla de abajo — la mayoría de los módulos operativos (POS, Inventario,
   Mantenimiento, Vehículos) deberían nacer con `business_id`, no solo `company_id`, porque su dato
   es inherentemente de una sucursal/punto físico, no de la empresa entera.

## 9.2 Módulos con backend real hoy

### Config Center (`config_center` → `/home-panel`)

Backend: paquete `configcenter` completo. Ya cubierto en detalle en
[02 §2.3](02-auditoria-estado-actual.md) y en [05](05-arquitectura-frontend.md) (secciones Plan y
Billing). Pendientes específicos de este módulo para SaaS:

- `Plan.tsx`/`Billing.tsx`: pasar de mock a real (05 §5.4-5.5).
- `Users.tsx`: invitación multi-company + gate de seats (05 §5.6).
- `BusinessStructure.tsx`: ya modela units/businesses correctamente dentro de una company; con
  `accounts`, gana el punto de entrada para "agregar otra empresa a mi cuenta" (05 §5.2).
- Roles: unificar vocabulario antes de construir el rol de owner de Account (08 §8.2).

### Recursos Humanos (`human_resources` → `/human-resources`)

Backend: paquete `hr` (el más grande y maduro del sistema — empleados, asistencia, nómina,
activos, kiosks, reconocimiento facial). Es, con diferencia, el módulo mejor preparado para
multi-tenant: ya usa `company_id` de forma consistente y ya piensa en 3 niveles
(`company → unit/business → recurso`) en varias tablas (`hr_attendance_locations`,
`hr_kiosk_devices`, `hr_assets`). Pendientes específicos:

- Cerrar hallazgos 1, 5 y 6 de [08 §8.1](08-seguridad-recomendaciones.md) (fuga por
  `company_id IS NULL`, consistencia `businesses.company_id`, FKs de `unit_id`/`business_id` en
  `hr_employees`).
- `hr_employee_number_sequences` está keyed solo por `company_id` (PK), no soporta numeración
  independiente por unidad de negocio — evaluar si algún dueño con varias companies bajo una
  account necesita numeración compartida entre ellas (hoy, al ser cada company un tenant separado
  con su propia secuencia, ya está correctamente aislado; no requiere cambio salvo que el producto
  pida lo contrario).
- `hr_kiosk_devices.public_access_token` es un token público por dispositivo — con más tenants,
  confirmar que la ruta `/kiosk/:deviceToken` (pública, sin loader de auth) resuelve el
  `company_id`/`business_id` **solo** a partir del token, nunca de un parámetro adicional
  manipulable por el cliente.

## 9.3 Módulos sin backend (18) — inventario y prioridad sugerida

Todos comparten el mismo estado: componente único en React con datos locales, sin persistencia
real. La columna "Scoping sugerido" es la recomendación de a qué nivel debe vivir el dato el día
que se construya el backend, siguiendo la jerarquía `account → company → unit → business` de
[01](01-vision-glosario.md).

| Módulo (slug) | Ruta | Categoría | Componente frontend | Scoping sugerido | Nota |
|---|---|---|---|---|---|
| `expenses` | `/expenses` | Básico | `Gastos.tsx` | `company_id` (+ `business_id` opcional) | Candidato de alta prioridad — suele ser de los primeros módulos que un dueño espera usar de inmediato. |
| `petty_cash` | `/petty-cash` | Básico | `CajaChica.tsx` | `business_id` obligatorio | La caja chica es físicamente de una sucursal, no de toda la empresa — nace con `business_id NOT NULL`. |
| `pos` | `/point-of-sale` | Básico | `PuntoDeVenta.tsx` | `business_id` obligatorio | Un punto de venta es una sucursal específica; además es el módulo con más probabilidad de necesitar throughput/latencia alta (transacciones), vale la pena diseñarlo pensando en eso desde el inicio. |
| `processes` | `/processes-tasks` | Básico | `ProcessesTasks.tsx` | `company_id` (asignable a `unit`/`business`) | Tareas/flujos pueden cruzar unidades dentro de una company — mantener `company_id` como ancla y `unit_id`/`business_id` opcionales por tarea. |
| `crm` / `sales` | `/sales` | Básico | `Ventas.tsx` | `company_id` (+ `business_id` opcional) | Dos slugs de backend (`crm`, `sales`) apuntan a la misma pantalla — decidir si son un solo módulo comercial o resolver la duplicación antes de facturarlos como líneas de plan distintas. |
| `kpis` | `/kpis` | Básico | `Kpis.tsx` | `company_id` | Si termina siendo agregación de otros módulos (ventas, gastos, RH), no necesita su propia tabla de datos — solo endpoints de agregación con el mismo `@RequiresModule`. |
| `maintenance` | `/maintenance` | Complementario | `Mantenimiento.tsx` | `business_id` obligatorio | Reportes de mantenimiento son de un activo/ubicación física — mismo criterio que `hr_assets`, reusar su patrón de `unit_id` opcional. |
| `inventory` | `/inventory` | Complementario | `Inventarios.tsx` | `business_id` obligatorio | Stock físico vive en una sucursal/bodega concreta; si un dueño tiene varias companies, el inventario **no** debe ser visible entre ellas aunque compartan `account_id` (respetar el aislamiento a nivel `company`, no solo `account`). |
| `control_minutas` | `/minutes-control` | Complementario | `ControlMinutas.tsx` | `company_id` | Actas/minutas de reuniones, normalmente a nivel empresa. |
| `cleaning` | `/cleaning` | Complementario | `Limpieza.tsx` | `business_id` obligatorio | Igual que mantenimiento — operación de una ubicación física. |
| `lavanderia` | `/laundry` | Complementario | `Lavanderia.tsx` | `business_id` obligatorio | Módulo de giro específico (lavandería) — de los que más ilustra el caso de uso "distintos negocios del mismo dueño" del usuario; debe quedar aislado por `company_id`/`business_id` sin fugas hacia otros giros del mismo dueño. |
| `transportacion` | `/transportation` | Complementario | `Transportacion.tsx` | `company_id` (+ `business_id` opcional) | Rutas/flotas pueden servir a varias sucursales de una company. |
| `vehiculos_maquinaria` | `/vehicles-machinery` | Complementario | `VehiculosMaquinaria.tsx` | `company_id`, similar a `hr_assets` | Buen candidato para reusar directamente el patrón de `hr_assets`/`hr_asset_assignments` (activo + responsable + historial de estado) en vez de diseñar uno nuevo desde cero. |
| `inmuebles` | `/properties` | Complementario | `Inmuebles.tsx` | `company_id` (+ `unit_id` opcional) | Puede modelarse como una extensión de `businesses` (cada inmueble ya podría *ser* una `business`) en vez de una entidad totalmente nueva — evaluar antes de construir. |
| `formularios` | `/forms` | Complementario | `Formularios.tsx` | `company_id` | Constructor de formularios genérico — cuidar que las respuestas (`form_responses`) también carguen `company_id`, no solo `form_id` (mismo patrón de riesgo que las tablas "sin `company_id` directo" señaladas en [03 §3.2](03-modelo-datos-multitenant.md) del análisis de esquema original). |
| `facturacion` | `/invoicing` | Complementario | `Facturacion.tsx` | `company_id` | Alto riesgo regulatorio (facturación fiscal) — evaluar por separado requisitos legales por país antes de construir; probablemente el módulo con más razón para tener un `tier` alto (`pro`/`enterprise`). |
| `correo` / `correo_electronico` | `/email` | Complementario | `CorreoElectronico.tsx` | `company_id` | Dos slugs para la misma pantalla, igual que `crm`/`sales` — resolver duplicación en el catálogo antes de vender esto como línea de plan. Si es cliente de correo/integración, revisar cuidadosamente que las credenciales de terceros (OAuth de email) se guarden por `company_id`, nunca compartidas entre tenants. |
| `clima_laboral` | `/work-climate` | Complementario | `ClimaLaboral.tsx` | `company_id` | Encuestas de clima laboral — dato sensible de empleados; aplicar el mismo cuidado de privacidad que ya tiene HR (`hr_employee_records` tiene borrado suave `deleted_at` — buen patrón a reusar aquí). |
| `agente_ventas` | `/sales-agent` | IA | `AgenteVentas.tsx` | `company_id` | Si consume un LLM externo, las credenciales/API keys de terceros deben resolverse por `account_id` o `company_id` según cómo se facture el add-on de IA — definir junto con el diseño de `subscription_addons` (06). |
| `indice_analitica` | `/analytics` | IA | `Analitica.tsx` | `company_id` (lectura agregada) | Probablemente solo lee de otros módulos — no necesita tablas propias si se implementa como agregación; heredar automáticamente el aislamiento de tenant de los módulos que consulta. |
| `capacitacion` | `/training` | IA | `Capacitacion.tsx` | `company_id` | Contenido de capacitación podría ser compartido a nivel `account` (mismo contenido para todas las companies de un dueño) en vez de duplicado por company — decisión de producto a tomar antes de construir el esquema. |
| `coach` | `/coach` | IA | `Coach.tsx` | `company_id` o por usuario | Si es un asistente conversacional personal, evaluar si el historial debe aislarse por `company_id` activa o seguir al usuario entre companies — afecta directamente el diseño de `CurrentCompanyContext` (05 §5.1). |

## 9.4 Duplicados a resolver en el catálogo antes de facturar por módulo

Dos pares de slugs distintos apuntan a la misma pantalla de frontend:

- `crm` y `sales` → ambos renderizan `Ventas.tsx`.
- `correo` y `correo_electronico` → ambos renderizan `CorreoElectronico.tsx`.

Esto es inofensivo hoy porque ningún módulo tiene enforcement de plan. **En cuanto se active
`account_module_entitlements`** (Fase 3, [07](07-roadmap-migracion.md)), hay que decidir: ¿son el
mismo producto comercial con dos slugs heredados (limpiar el catálogo, dejar uno solo) o son dos
funcionalidades distintas que hoy comparten pantalla por casualidad (separar el frontend)? Resolver
esto **antes** de definir qué `plans`/`tier` los incluye, para no vender confusamente "dos módulos"
que en realidad son uno.

## 9.5 Resumen de prioridad de construcción

Sugerido, a validar con negocio — no es un compromiso de producto, es una lectura técnica de qué
módulos ya tienen la mayor parte del patrón de datos resuelto en otro lugar del sistema y por tanto
cuestan menos construir bien:

1. **Alto reuso de patrones existentes**: `vehiculos_maquinaria` (reusa `hr_assets`), `inmuebles`
   (reusa `businesses`), `kpis`/`indice_analitica` (agregación, sin tablas propias).
2. **Alta demanda esperada, patrón nuevo pero simple**: `expenses`, `petty_cash`, `pos`.
3. **Patrón nuevo con más superficie regulatoria/técnica**: `facturacion`, `correo_electronico`
   (integración con terceros), `agente_ventas`/`coach` (integración con LLM externo).
