# Runbook — Índice Premium Multi-Tenant Fase 4

Estado: implementado en shadow, enforcement apagado por defecto

Fecha: 21 de julio de 2026

Alcance: resolución comercial de capabilities por `company_id`, comparación contra permisos
vigentes, proyección operativa y promoción reversible por cohortes.

## 1. Garantías

- Una empresa histórica sin fila en `company_entitlement_policies` conserva el modelo `LEGACY`.
- Una empresa premium nueva se inscribe automáticamente en `SHADOW` después del aprovisionamiento.
- El catálogo comercial habilita a la compañía, pero no concede permisos individuales. El acceso
  efectivo exige entitlement de compañía y asignación vigente del usuario, salvo el núcleo y el
  bypass explícito de soporte `root`/`superadmin`.
- Las fuentes efectivas son explicables: `CORE`, `TRIAL` o `SUBSCRIPTION`.
- Toda consulta de entitlement filtra por `company_id`; no existe una bolsa global de módulos.
- Instalar la migración o activar shadow no bloquea tráfico.
- El enforcement exige un flag global y una empresa en modo `ENFORCE` al mismo tiempo.
- El modo `DISABLED` por empresa restaura inmediatamente la decisión legacy.
- Una falla de evaluación o auditoría es fail-open durante la adopción de Fase 4 y queda registrada.

## 2. Estado seguro por defecto

```dotenv
APP_ENTITLEMENTS_SHADOW_ENABLED=true
APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=false
APP_ENTITLEMENTS_PROJECTION_ENABLED=true
APP_ENTITLEMENTS_PROJECTION_DELAY_MS=60000
APP_ENTITLEMENTS_PROJECTION_BATCH_SIZE=100
```

No habilitar enforcement global en el primer despliegue. Flyway aplicará `V148`; solo las empresas
que ya provengan del signup premium entrarán al cohort shadow mediante el backfill controlado.

## 3. Modelo de decisión

Para una ruta autenticada clasificada:

1. `TenantContext` toma la `company_id` activa desde la sesión validada.
2. Se normaliza el alias técnico a una capability canónica.
3. Se resuelven fuentes comerciales activas de esa misma empresa.
4. Se calcula el permiso legacy del usuario.
5. La decisión shadow es la intersección de entitlement empresarial y permiso individual.
6. Una diferencia se audita, pero no se bloquea mientras el flag global permanezca apagado.

Los productos core siempre incluyen `dashboard`, `config_center`, `kpis`, `security` y `billing`.
Los estados de suscripción que conceden acceso en esta fase son `trialing`, `active` y `past_due`.
La conversión de `past_due` a solo lectura se incorpora en Fase 6.

## 4. Cobertura de rutas

La clasificación explícita mediante `@RequiresCapability` tiene prioridad. Como red de cobertura,
el interceptor clasifica rutas autenticadas de RH, Tareas y Procesos, Expenses, Caja Chica, POS,
Ventas, Cartera, KPIs y Configuración.

Se excluyen deliberadamente:

- kioskos públicos;
- catálogos públicos;
- signup y retorno de Stripe;
- endpoints públicos del motor de plataforma.

Esas superficies no deben inferir tenant desde una cookie ERP. El enforcement de acciones públicas
se conectará a su contexto seguro de kiosko en Fase 6.

## 5. Inscribir una compañía interna en shadow

Primero identificar la compañía y el actor. No aceptar IDs proporcionados por el navegador sin
validarlos operativamente.

```sql
SET @company_id = ?;
SET @actor_user_id = ?;
SET @catalog_version_id = (
    SELECT id
    FROM billing_catalog_versions
    WHERE status = 'ACTIVE'
      AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
      AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
);

INSERT INTO company_entitlement_policies (
    company_id, catalog_version_id, mode, reason, activated_by_user_id, activated_at
) VALUES (
    @company_id, @catalog_version_id, 'SHADOW',
    'Internal phase 4 cohort', @actor_user_id, CURRENT_TIMESTAMP(6)
)
ON DUPLICATE KEY UPDATE
    catalog_version_id = COALESCE(company_entitlement_policies.catalog_version_id, @catalog_version_id),
    mode = 'SHADOW',
    reason = 'Internal phase 4 cohort',
    activated_by_user_id = @actor_user_id,
    activated_at = CURRENT_TIMESTAMP(6);
```

El job reconstruye la proyección en el siguiente ciclo. No promover hasta confirmar que existan
filas core y las fuentes comerciales esperadas.

## 6. Verificación SQL

```sql
SELECT company_id, catalog_version_id, mode, reason, activated_at, updated_at
FROM company_entitlement_policies
WHERE company_id = ?;

SELECT capability_code, source_type, source_reference,
       valid_from, valid_until, projected_at
FROM company_entitlements
WHERE company_id = ?
ORDER BY capability_code, source_type, source_reference;

SELECT decision_type, capability_code, operation_code,
       legacy_allowed, entitlement_allowed, effective_allowed,
       COUNT(*) AS occurrences,
       MIN(created_at) AS first_seen,
       MAX(created_at) AS last_seen
FROM entitlement_decision_events
WHERE company_id = ?
GROUP BY decision_type, capability_code, operation_code,
         legacy_allowed, entitlement_allowed, effective_allowed
ORDER BY last_seen DESC;
```

Una compañía está lista para promoción cuando todas sus capabilities contratadas aparecen con la
fuente correcta y no hay `SHADOW_MISMATCH` sin explicación. Un mismatch suele significar paquete
incompleto, alias/ruta no clasificada o permiso individual histórico mal asignado.

## 7. Promoción controlada

Orden recomendado:

1. Desplegar con shadow y proyección activos, enforcement global apagado.
2. Observar una compañía interna durante sus flujos críticos de lectura y escritura.
3. Corregir todas las diferencias no explicadas y repetir la prueba.
4. Cambiar únicamente esa compañía a `ENFORCE`.
5. Habilitar temporalmente el flag global en apptest y repetir el recorrido.
6. Regresar el flag global a `false` ante cualquier bloqueo inesperado.
7. Promover después una beta cerrada; nunca actualizar todas las compañías en una sola operación.

Promoción por compañía:

```sql
UPDATE company_entitlement_policies
SET mode = 'ENFORCE',
    reason = 'Approved internal phase 4 enforcement',
    activated_by_user_id = ?,
    activated_at = CURRENT_TIMESTAMP(6)
WHERE company_id = ? AND mode = 'SHADOW';
```

El cambio no bloquea nada mientras `APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=false`.

## 8. Kill switches y rollback

Apagado global del bloqueo:

```dotenv
APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=false
```

Restauración legacy de una sola empresa:

```sql
UPDATE company_entitlement_policies
SET mode = 'DISABLED',
    reason = 'Tenant kill switch',
    updated_at = CURRENT_TIMESTAMP(6)
WHERE company_id = ?;
```

Apagado opcional de toda telemetría:

```dotenv
APP_ENTITLEMENTS_SHADOW_ENABLED=false
APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=false
```

No revertir `V148` ni borrar proyecciones o eventos durante un incidente. Primero apagar el flag
global o usar `DISABLED`; conservar la evidencia permite corregir y volver a shadow sin pérdida de
trazabilidad.

## 9. Lista de certificación

- [ ] Empresa legacy conserva sus accesos sin policy row.
- [ ] Empresa shadow no recibe bloqueos.
- [ ] Core funciona sin compra adicional.
- [ ] Trial concede los seis productos básicos por 30 días.
- [ ] Suscripción solo concede sus productos activos.
- [ ] Usuario sin asignación no obtiene un módulo por la compra empresarial.
- [ ] Dos compañías con productos distintos no comparten capabilities.
- [ ] Suscripción cancelada deja de resolver su capability.
- [ ] `DISABLED` restaura el comportamiento legacy.
- [ ] Enforcement deniega únicamente empresa `ENFORCE` más flag global activo.
- [ ] Signup, Stripe, catálogos y kioskos públicos continúan operando fuera del interceptor ERP.

## 10. Salida hacia Fase 5

Fase 4 queda lista para avanzar cuando la cohorte interna complete la lista anterior sin fugas ni
bloqueos inesperados. Fase 5 incorporará seats facturables, transferencias de ownership y la
experiencia multi-company sobre este mismo `TenantContext`; no debe duplicar la resolución de
entitlements ni confiar en estado del frontend.
