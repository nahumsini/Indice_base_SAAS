# Índice ERP

Índice propone un ERP personalizado a los flujos de trabajo de la empresa, acompañado por
Lupita y especialistas digitales para profesionalizar su gestión sin multiplicar la estructura
gerencial. El ERP organiza la operación; los agentes ayudan con seguimiento, análisis,
coordinación y acciones autorizadas; el empresario conserva la dirección.

El [maestro comercial y agentes](docs/INDICE_MAESTRO_COMERCIAL_Y_AGENTES.md) define este
posicionamiento y el alcance solicitado. Su adopción documental no certifica todas las funciones
ni modifica el catálogo publicado. La base existente combina módulos operativos, indicadores y
aprendizaje contextual mediante la Metodología Índice.

## La Metodología Índice

| Etapa | Propósito | Módulos |
|---|---|---|
| 1. Define tu estructura | Organizar la empresa, sus unidades y sucursales. | Panel Inicial |
| 2. Organiza a tu equipo | Establecer responsabilidades, horarios y operación del personal. | Recursos Humanos |
| 3. Transforma el trabajo en procesos | Coordinar tareas, responsables, evidencias y seguimiento. | Procesos y Tareas |
| 4. Da claridad al dinero | Controlar gastos, fondos, obligaciones y cobranza. | Gastos, Caja Chica y Cartera |
| 5. Conecta productos y ventas | Relacionar catálogo, existencias, clientes y operación comercial. | Inventarios, Ventas y Punto de Venta |
| 6. Dirige con inteligencia operacional | Convertir la información en decisiones y acciones. | KPIs |

[Modo aprendiz](docs/learning-mode-frontend-engine-v2.md) explica cómo aplicar estas herramientas
dentro de la operación real, respetando los permisos de cada usuario.

## Cómo se organiza una empresa

**Empresa → Unidades → Negocios o sucursales**

- La empresa es el cliente de facturación y el límite de aislamiento de datos: `company_id`.
- Las unidades agrupan regiones o divisiones: `unit_id`.
- Los negocios representan sucursales o ubicaciones dentro de una unidad: `business_id`.
- La cantidad de unidades y negocios no genera un cobro adicional.
- Cada empresa tiene un propietario principal.
- La pertenencia organizacional y los permisos se administran por separado.

Una persona puede tener membresías en distintas empresas. Cada operación debe respetar la empresa
activa y el alcance autorizado. El [glosario](docs/product-glossary.md) explica estos conceptos y
las diferencias entre propietario, usuario, colaborador y administrador de plataforma.

Está aprobada la propiedad de varias empresas independientes por una misma persona; adaptar el
sistema a esa regla sigue [pendiente de implementación](docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md#4-propiedad-identidad-y-acceso-multi-company).

## Cómo se contrata

El nuevo modelo combina evaluación inicial sin costo, cuota de alta, implementación y una
suscripción a Controla, Escala o Corporativo, con diez colaboradores incluidos y ampliaciones
por bloques de diez. Cada persona registrada en RH o como usuario cuenta una vez, aunque use
el sistema, agentes y kioscos; cada acceso respeta contratación y permisos. La prueba ocurre
antes de contratar. El alta y la primera mensualidad se pagan al contratar, y la implementación
es obligatoria en los tres paquetes para adaptar la herramienta a los flujos empresariales.
Se ofrecen anualidad con 20% de descuento sobre paquete y bloques, y una sesión mensual de
consultoría de 60 minutos. Los detalles pendientes están en el maestro.

Los paquetes agrupan módulos; Lupita y sus especialistas representan responsabilidades de gestión.
Escala permite elegir POS o Ventas/CRM. Corporativo incluye ambos, Cartera y el módulo independiente
de KPIs; los indicadores internos de cada módulo permanecen disponibles según contratación y permisos.
Esta composición es la nueva definición comercial, no una modificación ya aplicada de entitlements.

Las tarifas, alcance y preguntas abiertas están en el
[maestro comercial](docs/INDICE_MAESTRO_COMERCIAL_Y_AGENTES.md). La transición técnica y la
preservación de contratos anteriores se rigen por el
[contrato de billing](docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md).
El catálogo publicado en cada ambiente determina su oferta efectiva. Publicar una versión nueva
no recalcula contratos históricos; esta actualización documental no publica ni migra suscripciones.

La disponibilidad de una función, su contratación por la empresa y su asignación a un usuario son
decisiones distintas. El backend verifica los permisos y el alcance antes de permitir una operación.

## Principios del producto

- Cada módulo conserva la responsabilidad de sus datos y reglas de negocio.
- Los cálculos financieros y las autorizaciones se resuelven en el backend.
- Presupuesto, gasto, pago y movimiento de fondos tienen significados distintos.
- Los indicadores explican su alcance y calidad; la falta de datos no equivale a cero.
- La interfaz comparte patrones de navegación, tablas, modales y accesibilidad.
- Los kioscos y la integración con IA utilizan los servicios de los módulos.
- Los cambios deben preservar los flujos existentes y su trazabilidad.

## Empieza por aquí

| Para… | Consulta… |
|---|---|
| Conocer las reglas de trabajo y la jerarquía documental | [AGENTS.md](AGENTS.md) |
| Recorrer los contratos por área | [Mapa documental](docs/README.md) |
| Entender los conceptos del producto | [Glosario](docs/product-glossary.md) |
| Entender marca, paquetes, agentes y nuevas tarifas | [Maestro comercial y agentes](docs/INDICE_MAESTRO_COMERCIAL_Y_AGENTES.md) |
| Entender transición, empresas, suscripciones y beneficios anteriores | [Contrato de billing](docs/INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md) |
| Trabajar en frontend | [Frontend Operating System](docs/indice-frontend-operating-system-v2.md) |
| Trabajar en backend | [Backend Operating System](docs/indice-backend-operating-system-v1.md) |
| Trabajar en kioscos y canales operativos | [Kiosk Standard Engine](docs/kiosk-standard-engine-v2.md) |
| Trabajar en herramientas de IA y MCP | [MCP Operating System](docs/indice-mcp-operating-system-v1.md) |
| Preparar el entorno local y las pruebas | [Desarrollo local](docs/local-development.md) |
| Preparar una liberación pública | [Seguridad de liberación](docs/indice-public-release-security-gate.md) |
| Desplegar o revertir una versión | [Guía de despliegue](deployment/README.md) |

Los documentos canónicos contienen las reglas vigentes. Los reportes fechados documentan trabajo y
verificaciones de un momento concreto. Una decisión aprobada, una función implementada y una
capacidad habilitada en producción representan estados distintos; consulta la evidencia de la
versión y el ambiente correspondientes.

## Estructura técnica

| Ruta | Responsabilidad |
|---|---|
| `react/src/app/` | Aplicación React activa, módulos e interfaz compartida. |
| `src/main/java/com/indice/erp/` | API Spring Boot y dominios de negocio. |
| `src/main/resources/db/migration/` | Migraciones Flyway. |
| `src/test/` y `react/tests/` | Pruebas de backend y regresiones de frontend. |
| `integrations/indice-mcp/` | Adaptador MCP para consultas y acciones confirmadas. |
| `docs/` | Estándares, contratos y documentación. |
| `deployment/` | Despliegue, verificaciones y rollback. |

Tecnologías principales: React, TypeScript, Vite, Java 21, Spring Boot, JdbcTemplate, MySQL,
Flyway y almacenamiento compatible con S3.

El frontend de producción vive en `react/src/app`. `react/src/modules` es una estructura histórica
inactiva. Las rutas se consultan en los controladores y contratos de cada área; existen APIs
`/api/v1`, rutas históricas y el canal de kioscos `/api/v2/kiosks`.

## Desarrollo local

Con los [requisitos locales](docs/local-development.md#requisitos) preparados, desde la raíz:

```bash
make dev
```

Frontend: `http://127.0.0.1:5174`. Backend: `http://127.0.0.1:8082`.

`make dev` prepara infraestructura y dependencias, restaura el acceso demo local cuando está
habilitado e inicia la aplicación. El reinicio destructivo de la base es una operación separada.
Las pruebas usan `indice_test_db`, nunca la base funcional ni producción. Consulta comandos,
efectos y configuración en [Desarrollo local](docs/local-development.md).

## Antes de modificar el sistema

1. Lee `AGENTS.md`, el estándar del área y el contrato del módulo afectado.
2. Revisa el código, las pruebas actuales y los cambios locales existentes.
3. Implementa una modificación acotada y verificable.
4. Actualiza el contrato si cambia una regla aprobada.
5. Ejecuta las validaciones correspondientes y reporta sus resultados y límites.

Las migraciones son forward-only. Los despliegues deben conservar datos, contratos comerciales y
una ruta de rollback compatible.
