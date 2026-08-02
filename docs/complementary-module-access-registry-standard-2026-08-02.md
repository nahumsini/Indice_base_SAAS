# Registro de acceso para módulos complementarios

Fecha: 2 de agosto de 2026

## Objetivo

Los módulos complementarios deben poder registrarse desde que entran al roadmap sin volverse visibles ni asignables antes de tiempo. El catálogo rector vive en `modules`; el frontend consume su estado y no decide por sí solo si un acceso puede otorgarse.

La cadena de autorización queda así:

`módulo registrado` → `módulo habilitado` → `entitlement de la empresa` → `asignación al usuario` → `scopes de pestaña, si existen`

Ningún paso posterior sustituye a uno anterior.

## Metadatos rectores

Cada fila de `modules` declara:

| Campo | Valores | Uso |
| --- | --- | --- |
| `module_category` | `basic`, `complementary`, `ai` | Agrupación del producto y del selector de accesos. |
| `lifecycle_status` | `planned`, `development`, `pilot`, `released`, `retired` | Estado real de madurez. |
| `access_model` | `module`, `tabs` | Acceso completo o desglose por pestañas. |
| `assignment_enabled` | `0`, `1` | Candado operacional independiente del estado visual. |
| `route_key` | ruta canónica frontend | Relación estable entre slug backend y superficie web. |

Un módulo solamente es asignable cuando:

- está activo;
- su ciclo de vida es `pilot` o `released`;
- `assignment_enabled = 1`;
- la empresa tiene un entitlement activo.

Los roles Root y Super Admin no saltan el entitlement de la empresa. Su acceso total aplica dentro del producto contratado, no fuera de él.

## Módulos complementarios registrados

| Slug | Ruta | Estado inicial | Modelo |
| --- | --- | --- | --- |
| `maintenance` | `maintenance` | conserva su estado actual | módulo |
| `control_minutas` | `minutes-control` | planeado, bloqueado | módulo |
| `cleaning` | `cleaning` | planeado, bloqueado | módulo |
| `lavanderia` | `laundry` | planeado, bloqueado | módulo |
| `transportacion` | `transportation` | planeado, bloqueado | módulo |
| `vehiculos_maquinaria` | `vehicles-machinery` | planeado, bloqueado | módulo |
| `inmuebles` | `properties` | planeado, bloqueado | módulo |
| `formularios` | `forms` | planeado, bloqueado | módulo |
| `facturacion` | `invoicing` | planeado, bloqueado | módulo |
| `correo` | `email` | planeado, bloqueado | módulo |
| `clima_laboral` | `work-climate` | planeado, bloqueado | módulo |
| `affiliates` | `affiliate-management` | planeado, bloqueado | módulo |

La migración no crea entitlements ni asignaciones para los módulos nuevos.

## Selector de accesos

El modal de Usuarios usa un solo selector para módulo y pestañas:

- búsqueda por módulo o pestaña;
- filtros por Básicos, Complementarios e IA;
- estado visible: disponible, piloto, en desarrollo, próximamente o no incluido;
- los módulos bloqueados se pueden consultar, pero no seleccionar;
- un módulo con `access_model = module` otorga acceso completo y no muestra scopes ficticios;
- un módulo con `access_model = tabs` despliega sus scopes dentro de la misma fila;
- al seleccionar un módulo con pestañas se aplican los defaults permitidos para el rol;
- al retirar el módulo se limpian también sus scopes.

La misma experiencia se usa para invitaciones y para edición de usuarios.

## Contrato backend para módulos futuros

Los endpoints privados de un módulo nuevo deben declarar `@RequiresModuleAccess("slug")` en su controlador o método. El interceptor verifica:

1. estado y candado del módulo;
2. entitlement activo de la empresa;
3. asignación del módulo al usuario, salvo Root o Super Admin;
4. scopes de pestaña adicionales mediante el estándar existente cuando `access_model = tabs`.

La falta de acceso responde `403` con código `module_access_required`.

## Procedimiento de activación

Para liberar un módulo complementario:

1. completar su ruta frontend y protegerla con el catálogo de módulos accesibles;
2. anotar sus APIs privadas con `@RequiresModuleAccess`;
3. si tendrá pestañas, registrar sus llaves canónicas y clasificadores de rutas;
4. cambiar `lifecycle_status` a `pilot` o `released`;
5. cambiar `assignment_enabled` a `1`;
6. crear el entitlement únicamente para las empresas contratadas;
7. validar asignación, retiro, URL directa y llamada directa a API.

Para retirar un módulo, primero se deshabilita la asignación y después se cambia a `retired`. Las asignaciones históricas permanecen auditables, pero dejan de generar nuevas concesiones.

## Fuente de verdad y escalabilidad

Agregar un futuro módulo complementario requiere una nueva fila de registro y su metadata frontend de presentación. No requiere modificar el modal de Usuarios ni crear un selector nuevo. Si el módulo evoluciona de acceso completo a pestañas, se cambia `access_model` y se incorpora su catálogo de scopes mediante una migración versionada.
