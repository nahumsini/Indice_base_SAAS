# Índice — salida controlada de Stripe LIVE

Fecha de preparación: 2026-08-03
Entorno real: `https://app.indiceapp.com`

## Resultado esperado

Una empresa nueva puede crear su cuenta, seleccionar una oferta aprobada, registrar
una tarjeta en Stripe, comenzar 15 días de prueba con `Corporativiza` y recibir el cobro recurrente
al finalizar la prueba. Los códigos de cortesía siguen omitiendo Stripe y la tarjeta.

La activación LIVE no es un cambio de una sola llave. TEST y LIVE tienen productos, precios,
webhooks, impuestos y secretos separados. Ningún secreto se guarda en Git.

## Oferta aprobada

| Selección | Mensual | Anual |
|---|---:|---:|
| 1 módulo básico | USD 79 | USD 758.40 |
| 2 o más módulos sueltos, cada uno | USD 49 | USD 470.40 |
| Controla | USD 99 | USD 950.40 |
| Escala Ventas o Escala POS | USD 149 | USD 1,430.40 |
| Corporativiza | USD 199 | USD 1,910.40 |

- El anual descuenta 20% únicamente al paquete.
- Cinco usuarios están incluidos.
- Cada usuario adicional cuesta USD 12 al mes o USD 144 al año, sin descuento anual.
- Una consultoría de 60 minutos al mes está incluida y no es acumulable; cada sesión adicional se
  compra por separado a USD 79.
- Se incluyen 5 GiB; cada bloque adicional de 5 GiB cuesta USD 15 mensual o USD 180 anual.
- Los precios son exclusivos de impuestos. Stripe Tax usa la dirección fiscal.

Productos básicos: Recursos Humanos; Procesos y Tareas; Gastos + Caja Chica; Punto de Venta +
Inventarios; Ventas + Inventarios; Cartera. Las dos combinaciones de venta pueden coexistir y
cuentan por separado, pero Inventarios se habilita una sola vez.

## Compuertas obligatorias

No abrir el alta pública en LIVE mientras falte cualquiera de estas condiciones:

1. Cuenta LIVE habilitada para cobros y depósitos.
2. Marca pública y dominio de Stripe muestran Índice, no otra marca histórica.
3. Stripe Tax está activo y tiene los registros fiscales LIVE confirmados por el contador de
   Índice. El sistema no debe inventar países donde la empresa no está registrada.
4. Todos los precios recurrentes LIVE coinciden con la tabla aprobada y usan USD, impuestos
   exclusivos y el intervalo correcto.
5. El webhook LIVE está firmado y apunta exactamente a
   `https://app.indiceapp.com/api/v1/billing/stripe/webhook`.
6. Existe un respaldo restaurable de MySQL y del almacenamiento antes de aplicar migraciones.
7. Se completó una compra LIVE interna controlada, su reembolso y la comprobación de módulos,
   factura, correo, panel root y auditoría.

## Instalación segura de la llave

La llave se captura directamente en el VPS. No se pega en chat, correo, capturas ni archivos del
repositorio.

```bash
install -d -m 700 /root/indice-production/secrets
(
  umask 077
  set -o noclobber
  read -rsp 'Stripe LIVE restricted key: ' INDICE_STRIPE_LIVE_KEY
  printf '\n'
  [[ "${INDICE_STRIPE_LIVE_KEY}" == rk_live_* || "${INDICE_STRIPE_LIVE_KEY}" == sk_live_* ]] || exit 1
  printf '%s' "$INDICE_STRIPE_LIVE_KEY" > /root/indice-production/secrets/stripe-live-key
  unset INDICE_STRIPE_LIVE_KEY
)
```

El archivo de entorno debe apuntar a esa ruta:

```dotenv
APP_BILLING_STRIPE_SECRET_KEY=
APP_BILLING_STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key
```

`up-host-network.sh` conserva el archivo durable con acceso exclusivo de `root`, prepara una copia
temporal dentro de un directorio del host que sólo `root` puede recorrer y la monta de sólo lectura
para el usuario sin privilegios del backend. El mismo mecanismo se usa para
`APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE`. La llave no aparece en `docker inspect` ni en Git.

El ejemplo de captura no sobrescribe un archivo existente. Conserva una llave
ya instalada; una rotación es una operación separada. Captura el secreto
`whsec_` del destino existente directamente en el VPS con permisos 600, en
`/root/indice-production/secrets/stripe-live-webhook`. Mantén vacías tanto
`APP_BILLING_STRIPE_SECRET_KEY` como `APP_BILLING_STRIPE_WEBHOOK_SECRET` cuando
se usan los archivos protegidos.

### Permisos de la llave restringida

Valida primero una llave TEST equivalente con los flujos reales. El backend
necesita escritura para Customers, Checkout Sessions, Subscriptions y sus items,
sesiones de Customer Portal, Products y Prices. El resumen de tarjeta necesita también lectura
de Payment Methods (Customers y Subscriptions ya forman parte de los permisos anteriores).
Esta consulta es de sólo lectura y no requiere permisos para capturar números de tarjeta.
Necesita lectura de la cuenta
propia y de Charges para asociar reembolsos/disputas recibidos al cliente
correcto. La auditoría operativa también consulta Tax Settings y Tax
Registrations; las promociones configuradas requieren leer Promotion Codes y
Coupons. Confirma los nombres y dependencias reales de esos permisos en Stripe.

La recepción de webhooks no requiere permisos de escritura de Events o Webhook
Endpoints. El script opcional de creación del destino sí tiene requisitos
distintos: no amplíes la llave del runtime para ejecutarlo si el destino ya existe.

### Tarjeta guardada y Customer Portal

Configura el portal del mismo modo y cuenta Stripe usados por el backend. El gateway utiliza la
configuración predeterminada de Customer Portal: habilita actualización de métodos de pago e
historial de facturas, y conserva los cambios de productos/cantidades en Índice. Verifica la URL
HTTPS de retorno `/billing`. Un secreto instalado no prueba que estas opciones estén configuradas.

Antes de habilitar LIVE, verifica en sandbox captura en Checkout con y sin prueba, actualización
de tarjeta en el portal, renovación aprobada, pago rechazado, autenticación bancaria adicional y
recuperación por el webhook firmado. Comprueba que el resumen cambia después de volver a Billing
y que un suscriptor sin tarjeta abre el portal sin crear otra suscripción. `SAVED` sólo significa
que Stripe devolvió una tarjeta predeterminada no expirada, no que un cobro futuro esté aprobado.
Las pruebas automatizadas con gateways simulados validan el código, pero no sustituyen esa
verificación con Stripe ni la comprobación operacional LIVE descrita en este runbook.
Esta lista describe las operaciones del código, no certifica los permisos de
una llave que todavía no se ha probado. No se necesita una llave publicable
para este flujo de Checkout alojado que crea la sesión desde el backend.

## Creación y auditoría del catálogo LIVE

```bash
STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key \
STRIPE_REQUIRED_TAX_COUNTRIES=CA,MX \
deployment/scripts/audit-stripe-live-readiness.sh
```

El catálogo LIVE se sincroniza únicamente desde el borrador aprobado en **Administración de
plataforma → Catálogo y módulos → Oferta comercial**, durante la ventana de mantenimiento y con la confirmación Root descrita en
`deployment/README.md`. El script de escalones históricos está retirado.

**Facturación** reúne el panel de configuración de la conexión Stripe y los registros de cobro
existentes. El panel no sustituye la verificación de credenciales, permisos y entrega firmada;
los productos, precios y publicación permanecen en **Catálogo y módulos → Oferta comercial**.

La lista fiscal del segundo comando es un ejemplo. Debe contener únicamente los países que el
contador confirme como registros activos obligatorios para Índice. El script falla si una marca,
dominio, habilitación o registro no coincide.

## Webhook LIVE

```bash
STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key \
STRIPE_WEBHOOK_SECRET_OUTPUT_FILE=/root/indice-production/secrets/stripe-live-webhook \
deployment/scripts/create-stripe-live-webhook.sh
```

El script captura la firma `whsec_` devuelta al crear el endpoint y la guarda en el archivo
protegido. Si ya existe un endpoint, el script se detiene: se debe usar su secreto existente,
disponible en el Dashboard, o realizar una rotación autorizada desde Stripe.

Si el destino se creó en el Dashboard, omite el script y captura su Signing
secret directamente en el VPS. Revisa **Your account**, payload **Snapshot**,
los 17 eventos del script y la versión API compatible con el SDK desplegado.
Un destino **Active**, un GET que devuelve 405 o un POST que devuelve 200 no
prueban por sí solos la aplicación del evento. Conserva evidencia de firma
válida, modo correcto, entrega exitosa, evento `PROCESSED` y efecto esperado en
la empresa/suscripción/factura. Prueba duplicados, desorden y recuperación de
fallos; los eventos de reembolso/disputa con sólo `charge` deben resolver su
cliente sin adivinar la empresa.

## Variables finales

```dotenv
APP_BILLING_STRIPE_ENABLED=true
APP_BILLING_STRIPE_MODE=live
APP_BILLING_STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key
APP_BILLING_STRIPE_WEBHOOK_SECRET_FILE=/root/indice-production/secrets/stripe-live-webhook
APP_BILLING_STRIPE_SUCCESS_URL=https://app.indiceapp.com/signup/complete?session_id={CHECKOUT_SESSION_ID}
APP_BILLING_STRIPE_CANCEL_URL=https://app.indiceapp.com/signup
APP_BILLING_STRIPE_PORTAL_RETURN_URL=https://app.indiceapp.com/home-panel/billing
APP_BILLING_STRIPE_AUTOMATIC_TAX_ENABLED=true
APP_BILLING_STRIPE_TAX_ID_COLLECTION_ENABLED=true
APP_BILLING_STRIPE_PROCESSOR_ENABLED=true
APP_BILLING_PROVISIONING_ENABLED=true
APP_ENTITLEMENTS_ENFORCEMENT_ENABLED=true
APP_BILLING_LIFECYCLE_ENABLED=true
APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED=true
APP_BILLING_LIFECYCLE_RETENTION_DAYS=90
```

Los Product y Price IDs verificados permanecen versionados en la base. El preflight impide iniciar
LIVE si falta una llave, firma, URL o control de ciclo comercial.

## Despliegue y prueba de control

1. Respaldar y verificar el respaldo.
2. Desplegar primero el nuevo código con `APP_BILLING_STRIPE_ENABLED=false`.
3. Confirmar login, dashboard, root e invitaciones existentes.
4. Configurar y auditar cuenta, impuestos y webhook LIVE; después ejecutar la
   ventana de mantenimiento y **Sincronizar y publicar oferta** desde
   **Catálogo y módulos → Oferta comercial**, según
   `deployment/README.md`. Esa secuencia explica cómo habilitar la conexión a
   Stripe sin abrir simultáneamente las altas al público.
5. Activar las variables finales y reiniciar únicamente backend/web.
6. Crear una cuenta interna con un correo nuevo y un plan de un producto.
7. Verificar en Stripe y root: tarjeta, trial de 15 días, cliente, suscripción, impuestos, empresa,
   propietario, cinco usuarios incluidos y seis módulos durante la prueba.
8. Reembolsar/cancelar la compra de control según corresponda y comprobar el evento de webhook.
9. Sólo entonces publicar el enlace de alta al mercado.

El Checkout inicial con prueba de 15 días no demuestra un cobro pagado. Certifica
en TEST, con Test Clocks cuando corresponda, el fin de prueba, cobro exitoso,
rechazo, factura, reintentos y acceso. Cualquier prueba LIVE con cargo/reembolso
real requiere definir previamente la cuenta interna, importe y autorización;
no adelantes ni alteres una suscripción de cliente para obtener esa evidencia.

## Reversa inmediata

Ante precio, impuesto, webhook o aprovisionamiento incorrecto:

```dotenv
APP_BILLING_STRIPE_ENABLED=false
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
APP_BILLING_PROVISIONING_ENABLED=false
APP_BILLING_LIFECYCLE_SCHEDULER_ENABLED=false
```

Reiniciar el backend con esas banderas detiene altas y procesamiento nuevos; no elimina cuentas ni
datos. Después se restaura la imagen anterior o el respaldo sólo si el incidente realmente lo
requiere.

Estas banderas no cancelan suscripciones ni detienen los cobros que Stripe ya
tiene programados. Deshabilitar la conexión también interrumpe la recepción de
webhooks. Conserva y reconcilia las entregas pendientes al recuperar el servicio;
cuando el incidente lo permita, bloquea las altas/cambios públicos conservando
el procesamiento de las suscripciones existentes.

## Compuerta del almacenamiento automático

El runtime ya reserva automáticamente bloques de 5 GiB sin interrumpir la carga y sincroniza la
cantidad a Stripe sin prorrateo para la siguiente factura. LIVE permanece bloqueado hasta certificar
en TEST consentimiento, cargas simultáneas, reintentos del outbox, factura y reconciliación
Stripe/object storage.
