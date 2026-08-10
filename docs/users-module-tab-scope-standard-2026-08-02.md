# Usuarios — estándar de scopes por módulo y pestaña 2026-08-02

## Estado

Implementación terminada para convertir las pestañas visibles del sistema en permisos reales y persistentes. El catálogo canónico contiene 53 scopes de pestaña distribuidos en 10 módulos con navegación operativa.

El permiso de módulo sigue siendo el primer candado. El scope de pestaña es el segundo. Para entrar o consumir una API protegida deben cumplirse ambos.

## Modelo de autorización

```text
empresa activa
  -> módulo contratado y asignado
    -> pestaña habilitada para el usuario
      -> rol compatible
        -> alcance organizacional permitido
```

- `module_slug` identifica el módulo de backend.
- `tab_key` identifica una pestaña estable dentro del módulo.
- `module_slug.tab_key` es la llave canónica que intercambian frontend y backend.
- `can_view = 1` habilita la superficie; `can_view = 0` la conserva explícitamente revocada.
- Cada entrada del catálogo declara `description_en`, `description_es`, `access_level`, `compatible_roles` y `role_access`; la UI no mantiene una explicación paralela.
- `role_access` describe únicamente capacidades que el modelo sí controla: consultar, uso personal, operar dentro del alcance, administrar alcance o empresa, delegar acceso propio y acceso protegido.
- Root y Super Admin tienen acceso irrestricto, pero Plan permanece marcado como scope protegido para impedir su delegación accidental.
- Admin puede delegar únicamente módulos, pestañas y alcance organizacional que ya posee.
- User puede recibir cualquier scope operativo de módulos como Inventarios, Ventas, POS, Gastos, Caja chica, Cartera, Procesos y KPIs.
- En Panel Inicial y Recursos Humanos, User conserva únicamente superficies personales; las superficies administrativas requieren Admin o Super Admin.

## Catálogo canónico

| Módulo | `module_slug` | Pestañas / `tab_key` | Total |
| --- | --- | --- | ---: |
| Panel Inicial | `config_center` | `profile`, `business-structure`, `business-profile`, `users` | 4 |
| Recursos Humanos | `human_resources` | `collaborators`, `attendance`, `control`, `payroll`, `announcements`, `assets`, `records`, `permissions`, `incentives`, `kpis` | 10 |
| Procesos y Tareas | `processes` | `calendar`, `projects`, `processes`, `kpis` | 4 |
| Gastos | `expenses` | `expenses`, `budgets`, `providers`, `accounting`, `payment-accounts`, `kpis` | 6 |
| Caja chica | `petty_cash` | `cash`, `control`, `statements`, `kpis` | 4 |
| Ventas | `crm` | `leads`, `contacts`, `quotes`, `sales`, `contracts`, `kpis` | 6 |
| Punto de venta | `pos` | `sale`, `cortes`, `clientes`, `facturacion`, `descuentos`, `kpis`, `kiosks` | 7 |
| Inventarios | `inventory` | `products`, `inventory`, `providers`, `purchase-orders` | 4 |
| Cartera | `receivables` | `credit-sales`, `accounts-receivable`, `payments`, `credit-customers` | 4 |
| KPIs | `kpis` | `kpis`, `accounting-reports`, `automated-reports` | 3 |
| Total | 10 módulos | 53 scopes | 53 |

`maintenance` continúa como módulo asignable, pero todavía no declara pestañas navegables; por ello permanece con control a nivel módulo hasta que tenga una superficie funcional definida.

## Compatibilidad del rol User

Dentro de Panel Inicial y Recursos Humanos, User puede recibir únicamente:

- `config_center.profile`
- `human_resources.attendance`
- `human_resources.control`
- `human_resources.announcements`
- `human_resources.assets`
- `human_resources.permissions`

Fuera de esos dos módulos puede recibir cualquiera de los scopes operativos del catálogo, siempre que también tenga asignado el módulo propietario.

## Comportamiento del frontend

- El modal de invitación y edición obtiene el catálogo desde backend; no mantiene una lista visual independiente.
- Los módulos se muestran plegados para evitar un modal excesivamente largo.
- Existe búsqueda por nombre de módulo o pestaña, conteo por módulo y acciones Todas/Ninguna.
- Al cambiar el rol se eliminan del borrador los scopes incompatibles.
- El selector muestra un resumen del rol y alcance elegidos, la función de cada pestaña, sus capacidades efectivas y el motivo de cualquier restricción.
- Las pestañas incompatibles permanecen visibles como contexto, pero bloqueadas; esto permite entender qué cambia al elegir otro rol sin conceder el permiso.
- La navegación compartida oculta pestañas sin permiso.
- Una URL directa a una pestaña denegada redirige a la primera pestaña permitida del módulo; si el usuario no tiene ninguna, regresa al dashboard.
- Panel Inicial, Recursos Humanos y KPIs conservan sus restricciones específicas además del guard compartido.

## Comportamiento del backend

- Un interceptor clasifica las rutas administrativas y operativas por scope.
- Una llamada sin módulo asignado o sin `can_view = 1` responde `403` con código `tab_permission_required`.
- Las superficies públicas de kioscos, autenticación, invitaciones, signup y webhooks quedan excluidas.
- Los endpoints compartidos de lectura usan una regla `anyOf`: basta uno de los scopes consumidores. Las mutaciones conservan el scope propietario más estricto.
- Las rutas administrativas del Kiosk Engine heredan el scope de la pestaña que administra cada kiosco.

## Persistencia y migración

La migración `V158__complete_module_tab_scope_catalog.sql` agrega únicamente filas faltantes:

- no sobrescribe decisiones existentes de `can_view`;
- habilita por defecto las nuevas pestañas pertenecientes a módulos ya asignados, para no romper usuarios existentes;
- deja Plan revocado para roles no protegidos;
- deja revocadas para User las pestañas administrativas de Panel Inicial y RH;
- aplica la misma política a invitaciones pendientes.

Las tablas rectoras continúan siendo:

- `user_company_module_roles`
- `user_company_tab_permissions`
- `user_invitation_tab_permissions`

## Regla para agregar una pestaña futura

Toda pestaña nueva debe incorporarse en una sola entrega a:

1. `ConfigCenterTabPermissionCatalog` con nombres en inglés y español;
   también debe incluir descripción funcional y clasificación de acceso por rol;
2. `MODULE_TAB_SCOPE_CATALOG` con la relación entre ruta frontend y llave canónica;
3. una migración que cree la fila faltante para usuarios e invitaciones existentes;
4. `TabPermissionRouteClassifier` para las APIs propietarias o dependencias compartidas;
5. pruebas de catálogo, ruta, rol y navegación.

No debe publicarse una pestaña que solo esté oculta visualmente. El backend debe negar también la operación directa.

## Validación

- catálogo: 53 scopes únicos y 10 módulos;
- compatibilidad de rol, techo de Admin y protección de Plan cubiertos por pruebas;
- clasificación de rutas privadas y exclusión de rutas públicas cubiertas por pruebas;
- migración V158 aplicada desde cero y revalidada sin sobrescribir permisos existentes;
- 39 pruebas backend focalizadas aprobadas, incluido arranque completo del contexto Spring y la doble exigencia módulo + pestaña;
- typecheck, matriz frontend completa, 8 regresiones específicas de Usuarios y build de producción aprobados.

La matriz backend global conserva una deuda ajena a estos scopes: `HrFirstRunIntegrationTest` ejecuta mutaciones históricas sin el token CSRF actualmente obligatorio y recibe `403 Invalid CSRF token` en 22 casos. Las pruebas y el código de la matriz no fueron relajados para ocultar esa incompatibilidad.

## Extensión para módulos complementarios

El ciclo de vida, los entitlements y el acceso completo de los módulos complementarios se rigen por `complementary-module-access-registry-standard-2026-08-02.md`. Un módulo futuro no debe inventar pestañas para poder aparecer en Usuarios: comienza con `access_model = module` y solo evoluciona a `tabs` cuando sus superficies y APIs tengan scopes reales.
