# Flujo de prospectos y diagnóstico empresarial (2026-10-04)

La decisión comercial vigente para la web pública es un solo CTA: **solicitar un diagnóstico
empresarial inicial sin costo**. Índice contacta personalmente al interesado. La comunicación
se centra en Lupita, sus capacidades especializadas para operar módulos desde herramientas de
IA compatibles, consultores, automatización empresarial y kioscos; no promete automatización
autónoma sin revisión ni una prueba inmediata.

## Recorrido y autoridad

1. Web principal, metodología y enlaces de redes llevan a `/diagnostico.php`.
   `/planes.php` publica los tres planes confirmados el 2026-10-04 para México
   (Controla 2,999, Escala 5,499 y Corporativo 9,499 MXN/mes), sus alcances,
   anualidades y cargos de implementación. Sus tres CTA llevan al mismo diagnóstico,
   no a checkout. `/contacto.php` redirige allí.
   La comparación pública desglosa los módulos y la asignación comercial prevista de IA:
   Controla incluye Lupita y Controla; Escala agrega Escala y Finanzas; Corporativo agrega
   Corporativo. Cada especialista se limita a los módulos y permisos configurados, y la
   disponibilidad técnica se confirma en el diagnóstico; la tabla no concede entitlements.
2. La persona entrega nombre, empresa, correo, reto y permiso expreso de contacto. País y
   teléfono y plan de interés son opcionales. Se conservan canal y UTM para atribución.
3. El servidor PHP valida CSRF, honeypot, límites por IP (5 envíos/10 minutos) y campos. Sólo
   él firma el JSON con HMAC-SHA256, ID único y timestamp; el navegador nunca recibe el secreto.
4. `POST /api/v1/public/platform-leads` verifica firma y ventana de cinco minutos; una clave
   de envío repetida sólo es idempotente si el cuerpo coincide. Si la app no confirma 201, la
   web muestra error y **no** afirma haber guardado el prospecto. No hay PII en log local.
   V289 conserva el plan de interés validado (`CONTROLA`, `ESCALA`, `CORPORATIVO`) para
   que el consultor lo vea en la bandeja sin tratarlo como selección contractual.
5. `PLATFORM_ROOT` o un administrador con `MANAGE_LEADS` y MFA entra a la bandeja de prospectos.
   El lead nuevo recibe una próxima acción interna a 24 horas; el equipo puede asignar
   responsable, ajustar esa fecha y agregar notas. Se conserva historia de cambios.
6. Estados: `NEW` → `CONTACTED` → `DIAGNOSIS_SCHEDULED` → `DIAGNOSIS_COMPLETED`.
   A partir de un diagnóstico completado puede pasar a `TRIAL_ACTIVE` (ventana de 15 días,
   seguimientos sugeridos días 3, 7 y 15) o `PROPOSAL`. Hay salidas `NURTURE` y `LOST` con
   motivo, y `WON` después de propuesta.

`TRIAL_ACTIVE` en la bandeja **registra la decisión comercial**; no provisiona por sí solo un
tenant, suscripción, agentes ni entitlements. La activación técnica se hace por el flujo
administrativo autorizado y debe verificarse por separado. No se modifican cobros de Stripe,
catálogo, contratos existentes ni las rutas históricas de signup del SaaS.

## Seguridad, despliegue y reversión

- `APP_PLATFORM_LEAD_INGEST_SECRET` en backend y `INDICE_LEAD_INGEST_SECRET` en PHP deben ser
  el mismo secreto privado aleatorio de al menos 32 caracteres. Se configura fuera de git.
- Desplegar primero backend + migraciones V288 y V289 y comprobar salud y bandeja; configurar el secreto;
  después desplegar la web. Probar un envío sintético consentido en staging, verificar que
  aparece una sola vez en la bandeja y que rechazo de firma/CSRF no crea registros.
- Para revertir la presentación, restaurar la web anterior y retirar el secreto de ingesta.
  V288 y V289 son forward-only: tablas y prospectos se conservan; no borrar datos comerciales.

Nota de integración: este candidato parte de la versión productiva V287. El trabajo de
oportunidades comerciales aún no publicado usaba el número V288 en otra rama; antes de
incorporarlo a una liberación posterior habrá que asignarle una versión nueva, sin modificar
estas migraciones una vez aplicadas.
- No registrar cuerpo, email, teléfono, firma ni secreto en logs. Restringir retención y acceso
  al equipo comercial autorizado; cualquier política de eliminación requiere decisión aparte.
