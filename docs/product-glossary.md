# Glosario del producto

Estado: guía de lectura; resume contratos existentes y no crea reglas nuevas.
Autoridad: [AGENTS.md](../AGENTS.md) y el contrato propietario enlazado en cada sección.

## Empresa, identidad y acceso

Fuentes: [modelo comercial](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md) y
[estándar backend](indice-backend-operating-system-v1.md).

| Concepto | Significado |
|---|---|
| Empresa / company | Marca corporativa, cliente de facturación y tenant raíz (`company_id`). |
| Unidad / unit | Región o división dentro de una empresa (`unit_id`). |
| Negocio / business | Sucursal o ubicación operativa dentro de una unidad (`business_id`). |
| Tenant | Frontera de aislamiento de una empresa. No es una capa `accounts` adicional. |
| Usuario | Identidad de acceso. Su membresía determina el vínculo y rol dentro de una empresa. |
| Colaborador | Registro de una persona en Recursos Humanos. No equivale automáticamente a una cuenta de acceso. |
| Membresía | Relación de un usuario con una empresa; una persona puede participar en varias empresas. |
| Propietario principal | Titular de la empresa. La transferencia usa un flujo explícito y auditado. |
| Rol de empresa | Autoridad del usuario dentro de la empresa, limitada además por los contratos de acceso. |
| Administrador de plataforma | Autoridad administrativa de Índice, con APIs y auditoría propias. No equivale a ser propietario de una empresa. |
| Alcance organizacional | Unidades, negocios o recursos sobre los que puede operar el usuario. |
| Corporate Office / Headquarters | Pertenencia organizacional; no concede por sí misma un rol ni permisos. |

El código comercial heredado `SUPER_ADMIN` puede presentarse como Cliente en Administración de
plataforma. Ese tipo comercial no convierte a una persona en administrador de plataforma ni
sustituye el rol de su membresía. La política de propiedad de múltiples empresas se consulta en la
sección 4 del modelo comercial: una persona puede ser propietaria principal de varias empresas
independientes. La regla está aprobada; adaptar la restricción del esquema y los flujos de alta y
transferencia sigue pendiente. Cada empresa conserva su suscripción, datos y permisos separados.

## Contratación y disponibilidad

Fuentes: [catálogo y billing](INDICE_PREMIUM_MULTITENANT_BILLING_ARCHITECTURE.md) y
[registro de módulos](complementary-module-access-registry-standard-2026-08-02.md).

| Concepto | Significado |
|---|---|
| Producto comercial | Lo que se contrata; puede habilitar uno o varios módulos. |
| Paquete | Composición de productos con precio explícito propio. |
| Módulo | Área funcional del ERP, como Gastos o Inventarios. No equivale necesariamente a una línea de cobro. |
| Capability | Capacidad técnica canónica que habilita un producto o beneficio. |
| Entitlement | Derecho efectivo de una empresa a usar una capacidad, sujeto a fuente y vigencia. |
| Asignación | Módulo autorizado a una persona dentro de su empresa. |
| Permiso de pestaña | Acceso a una superficie específica del módulo, con controles backend propios. |
| Seat / lugar | Capacidad contratada para usuarios activos. No es un registro de RH ni una sucursal. |
| Catálogo publicado | Versión comercial activa en un ambiente. Un borrador aprobado documentalmente no está publicado por ese hecho. |
| Selección comercial | Productos y capacidad elegidos. Un borrador sin contrato no concede acceso. |
| Cortesía | Beneficio administrativo explícito de acceso o capacidad, con autoridad y auditoría. |
| Promoción | Descuento comercial; por sí mismo no concede permisos ni sustituye una cortesía. |
| Prueba / trial | Acceso temporal bajo las condiciones de alta aprobadas. Se distingue de la demo pública. |

La operación combina ciclo comercial, entitlement, asignación, pestaña, rol y alcance. Los canales
públicos tienen sus contratos propios; no se les aplica una excepción general de autorización.

## Dinero y operación

Fuentes: [reglas financieras](../react/src/app/BasicModules/Expenses/domain/FINANCE_BUSINESS_RULES.md),
[fondos](../react/src/app/BasicModules/Expenses/domain/PETTY_CASH_DOMAIN_CONTRACT.md) y
[Tesorería](pos-treasury-settlement-contract-v1.md).

| Concepto | Pregunta que responde |
|---|---|
| Cuenta de pago | ¿Dónde está el dinero y cuánto está disponible o pendiente? |
| Fondo | ¿Para qué se administra el dinero y quién lo tiene en custodia? |
| Presupuesto / línea presupuestaria | ¿Cuánto gasto está autorizado y cuánto está comprometido o consumido? |
| Gasto | ¿Qué consumo real tuvo la empresa? Su reconocimiento sigue el contrato financiero. |
| Pago | ¿Qué importe se aplicó a una obligación? No se fabrica cambiando una etiqueta de estado. |
| Transferencia o fondeo | ¿Cómo cambió la ubicación o custodia del dinero? No es por sí mismo un gasto. |
| Cuenta por pagar | ¿Qué obligación mantiene la empresa con un tercero? |
| Cuenta por cobrar / cartera | ¿Qué saldo debe un cliente a la empresa? |
| Movimiento de Tesorería | Evidencia del cambio de saldo de una cuenta, con origen e idempotencia. |
| Asiento contable | Registro del libro contable; tiene reglas propias de contabilización, cierre y reversión. |

Un saldo actual no equivale a un cierre histórico. La moneda de presentación no cambia la moneda
original de una transacción. La presencia de un comprobante no prueba por sí sola autorización,
conciliación bancaria ni cumplimiento fiscal.

## Canales y evidencia

- **Kiosko:** canal de acceso operativo acotado. El Engine controla el canal y el módulo controla
  la operación. Véase [Kiosk Standard Engine](kiosk-standard-engine-v2.md).
- **MCP:** interfaz delegada de negocio para IA, con permisos vigentes y confirmación de acciones.
  Véase [MCP Operating System](indice-mcp-operating-system-v1.md).
- **KPI disponible:** medición con población y evidencia suficientes. Un cero medido se distingue
  de una cifra no disponible. Véase [contrato ejecutivo](KPI_EXECUTIVE_DECISION_CONTRACT.md).
- **Aprobado / implementado / verificado / desplegado:** estados diferentes. El
  [mapa documental](README.md#cómo-interpretar-el-estado-de-un-documento) explica cómo leerlos.
