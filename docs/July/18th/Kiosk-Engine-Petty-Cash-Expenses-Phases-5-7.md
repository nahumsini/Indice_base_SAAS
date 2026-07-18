# Kiosk Engine v2 — Cumplimiento final de Petty Cash y Expenses/CxP

Fecha de cierre técnico: 2026-07-18  
Documento rector: `docs/kiosk-standard-engine-v2.md`  
Alcance evaluado: Fase 5 — Caja Chica y Fase 7 — CxP y proveedores

## 1. Dictamen

Los kioskos de Petty Cash y Expenses/Cuentas por Pagar cumplen el 100 % de los requisitos aplicables a sus fases en Kiosk Standard Engine v2.

El dictamen cubre compatibilidad legacy, Registry, lifecycle, sesiones canónicas, PIN personal, grants, capabilities tipadas, dispatcher, adapters, alcance, CSRF, rate limiting, idempotencia, archivos, auditoría Engine/módulo, UX pública, Modal Engine y biometría de proveedor. No declara terminadas las fases independientes de RH, Global Kiosk Center o Multi Kiosk Dashboard.

## 2. Regla de propiedad

```text
Enlace público legacy o v2
→ Kiosk Engine: definición, sesión, grant, seguridad, acción y archivo
→ adapter tipado del módulo
→ caso de uso financiero existente
→ tablas, políticas y auditoría funcional de Finanzas
```

El Engine controla el canal. Petty Cash y Expenses conservan la verdad financiera: fondo, período, saldo, movimiento, proveedor, cuenta por pagar, evidencia y estado de revisión.

## 3. Matriz de cumplimiento común

| Área | Resultado | Implementación |
|---|---|---|
| Registry | Cumple | Definiciones por módulo, referencia legacy, hash de token, hint, versión y alcance |
| Ownership | Cumple | `PETTY_CASH` y `EXPENSES`; cada definición pertenece hoy a un módulo |
| Lifecycle | Cumple | `ACTIVE`, `DISABLED`, `EXPIRED`, `REVOKED`, rotación y eliminación física auditada |
| Compatibilidad | Cumple | Las rutas, tokens, payloads y respuestas v1 existentes continúan; v2 usa envelope normalizado |
| Feature flags | Cumple | adapters de Petty Cash y Payables habilitables de forma independiente |
| Sesión | Cumple | sesión común ligada a navegador, identidad, grants, alcance y expiración/inactividad |
| PIN | Cumple | credencial personal con hash, mostrar una vez, rotación y backfill de accesos de proveedor |
| Autorización | Cumple | intersección de kiosko, módulo, capability, grant, identidad, scope y regla financiera |
| CSRF | Cumple | bootstrap emite token y las mutaciones browser lo exigen |
| Rate limiting | Cumple | límites separados para bootstrap, PIN, consulta, mutación y archivo |
| Idempotencia | Cumple | todas las mutaciones, incluidos los `presign`, exigen clave acotada a kiosko/identidad/capability |
| Archivos | Cumple | imágenes, PDF y documentos; máximo 5 de 10 MiB; audio/video rechazados |
| Intención/adopción | Cumple | presign común, ownership por sesión/recurso, adopción única y limpieza de incompletos |
| Auditoría | Cumple | eventos Engine y Finanzas correlacionados por request/action/referencia, mínimo 365 días |
| Eliminación | Cumple | snapshot histórico antes de borrar definición; no destruye movimientos, cuentas ni evidencia |
| Operación online | Cumple | sin cola offline; se informa y bloquea envío al perder conectividad |
| Shell público | Cumple | shell, estados, boundary de sesión, mobile first y dark mode compartidos |
| Administración | Cumple | `indice-modal`, rotación, estados, grants, eliminación y consulta de auditoría |

## 4. Petty Cash — Fase 5

### 4.1 Contrato de capabilities

| Capability | Política | Acceso | Mutación |
|---|---|---|---|
| `petty-cash.identity.verify@1` | `DIRECT` | `CONTROLLED` | No |
| `petty-cash.movements.read@1` | `INFORMATION_ONLY` | `CONTROLLED` | No |
| `petty-cash.receipt.create@1` | `DIRECT` | `CONTROLLED` | Sí |
| `petty-cash.receipt.delete@1` | `DIRECT` | `CONTROLLED` | Sí |
| `petty-cash.attachments.read@1` | `INFORMATION_ONLY` | `CONTROLLED` | No |
| `petty-cash.attachment.presign@1` | `DIRECT` | `CONTROLLED` | Sí |
| `petty-cash.attachment.register@1` | `DIRECT` | `CONTROLLED` | Sí |

El adapter conserva consultas de movimientos, períodos, ingresos y recibos. Las altas y bajas de recibos siguen actualizando fondo, estado de cuenta y reglas financieras mediante los servicios de Petty Cash.

### 4.2 Registry y lifecycle

- El fondo es la referencia legacy de la definición.
- Token y URL existentes se backfillean mediante V122.
- Rotar el enlace reemplaza el hash y revoca sesiones.
- Deshabilitar y habilitar sincroniza Registry y `kiosk_enabled`.
- Revocar es definitivo.
- “Eliminar acceso” ahora elimina físicamente la definición con snapshot y limpia token/URL del fondo; no elimina el fondo.
- Eliminar el fondo también elimina su definición antes del soft delete funcional.

### 4.3 UX

Petty Cash permanece como referencia visual pública: captura móvil, balance, período, recibos, ingresos, archivos y consulta histórica. Usa shell común, aviso offline, boundary de 3 minutos, selector de idioma, dark mode, validación de 5 archivos/10 MiB y feedback de envío parcial.

## 5. Expenses/CxP y proveedores — Fase 7

### 5.1 Contrato de capabilities

| Capability | Política | Acceso | Mutación |
|---|---|---|---|
| `payables.identity.verify@1` | `DIRECT` | `CONTROLLED` | No |
| `providers.registration.submit@1` | `REVIEW_REQUIRED` | `PUBLIC` | Sí |
| `payables.submission.create@1` | `REVIEW_REQUIRED` | `CONTROLLED` | Sí |
| `payables.attachment.presign@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.attachment.register@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.enrollment.status@1` | `INFORMATION_ONLY` | `CONTROLLED` | No |
| `payables.face.enrollment.begin@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.enrollment.capture.presign@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.enrollment.complete@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.consent.withdraw@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.verification.begin@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.verification.capture.presign@1` | `DIRECT` | `CONTROLLED` | Sí |
| `payables.face.verification.complete@1` | `DIRECT` | `CONTROLLED` | Sí |

El registro de proveedor conserva la decisión explícita de producto: puede iniciarse anónimamente desde el enlace, pero sólo crea un proveedor pendiente de revisión. No crea sesión controlada, grant ni capacidad financiera. Después de aprobación, el acceso usa PIN personal y grants; la cuenta por pagar siempre es `CONTROLLED + REVIEW_REQUIRED`.

### 5.2 Identidad y grants

- V126 registra kioskos existentes, migra el PIN de cada proveedor a la credencial común y crea grants.
- Una credencial activa se reutiliza entre kioskos autorizados de la misma identidad.
- Revocar un grant revoca inmediatamente las sesiones afectadas.
- El Engine establece la sesión canónica y el módulo continúa validando que la cuenta pertenezca al proveedor autenticado.

### 5.3 Biometría facial

- Autoenrolamiento por el propio proveedor después del PIN.
- Consentimiento explícito y revocable; nunca se enrola silenciosamente.
- Desafío vivo de tres capturas: frente, izquierda y derecha.
- Comparación exclusivamente uno a uno; no existe búsqueda masiva.
- Las capturas crudas se eliminan después de cada intento procesado y un job limpia residuos vencidos.
- Kiosk Engine guarda consentimiento y `template_reference`; el vault del subsistema facial guarda la plantilla, evitando duplicarla en el Engine.
- Retirar consentimiento elimina inmediatamente la plantilla y conserva sólo auditoría no biométrica.
- Una coincidencia con liveness agrega `FACE` a los factores verificados y registra `last_face_verified_at`.
- La empresa puede activar/desactivar biometría desde la administración de CxP; el backend vuelve a validar la política en cada paso.
- Si el servicio facial o el bucket biométrico no están disponibles, la UI lo informa y PIN continúa operando.

### 5.4 UX y administración

El workspace público conserva registro de proveedor, PIN, cuenta por pagar y evidencias. Agrega shell común, idioma, dark mode, estados online/sesión, límites de archivo, idempotencia, enrolamiento/verificación facial, retiro de consentimiento y confirmaciones explícitas.

La administración conserva el Modal Engine y agrega lifecycle completo, rotación con revocación de sesiones, eliminación física, grants/auditoría v2 y política biométrica de empresa.

## 6. Contratos HTTP

### Legacy conservado

```text
/api/v1/finance/petty-cash/public-kiosk/{fundToken}/...
/api/v1/finance/public-payable-kiosks/{token}/...
/api/v1/finance/petty-cash/funds/{fundId}/...
/api/v1/finance/payable-kiosks/...
```

### Canónico v2

```text
/api/v2/kiosks/public/{token}/...
/api/v2/finance/petty-cash/kiosks/...
/api/v2/finance/payable-kiosks/...
```

## 7. Datos y migraciones

| Migración | Propósito |
|---|---|
| V121 | Registry, capabilities, grants, sesiones y acciones comunes |
| V122 | Backfill de fondos Petty Cash |
| V123 | Ownership congelado de intenciones de archivo |
| V126 | Registry CxP, credencial personal y grants de proveedor |
| V127 | Auditoría funcional de kioskos financieros |
| V128 | vault facial, consentimiento, enrolamientos, verificaciones, capturas, eventos y factor facial |

Las migraciones son aditivas. No eliminan tablas legacy ni trasladan la lógica financiera al Engine.

## 8. Verificación ejecutada

Validación final del 18 de julio de 2026:

| Validación | Resultado |
|---|---|
| Compilación Java | `725` fuentes principales compiladas |
| Compilación de pruebas Java | `126` fuentes de prueba compiladas |
| Suite enfocada Kiosk Engine + Petty Cash + CxP + regresión del adapter de Tareas | `78` pruebas, `0` fallos, `0` errores, `0` omitidas |
| TypeScript | `npm run typecheck` exitoso |
| Bundle de producción | `npm run build` exitoso |

Dictamen: Petty Cash y Expenses/CxP cumplen el 100 % de los requisitos aplicables de las Fases 5 y 7 del MD Rector. El “1100” solicitado queda interpretado y entregado como cierre reforzado: además de la paridad funcional se verificaron lifecycle físico del enlace, idempotencia de presigns, ownership de archivos, credencial personal, revocación, sesión canónica, auditoría dual y consentimiento biométrico con plantilla aislada. Las Fases 8 y 9 siguen siendo evoluciones separadas, no deuda interna de estos kioskos.

## 9. Límites deliberados

- Todo funciona 100 % online.
- Correo verificado pertenece a la evolución general de identidad, no es requisito de estos dos flujos actuales.
- RH conserva su propia Fase 6 y no comparte tablas de plantilla con proveedores.
- Global Kiosk Center y Multi Kiosk Dashboard conservan Fases 8 y 9; sus flags permanecen independientes.
- La biometría requiere habilitar el servicio facial y Object Storage en el ambiente de despliegue.
