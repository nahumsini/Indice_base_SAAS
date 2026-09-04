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
install -m 600 /dev/null /root/indice-production/secrets/stripe-live-key
read -rsp 'Stripe LIVE secret key: ' INDICE_STRIPE_LIVE_KEY
printf '%s' "$INDICE_STRIPE_LIVE_KEY" > /root/indice-production/secrets/stripe-live-key
unset INDICE_STRIPE_LIVE_KEY
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

## Creación y auditoría del catálogo LIVE

```bash
STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key \
STRIPE_REQUIRED_TAX_COUNTRIES=CA,MX \
deployment/scripts/audit-stripe-live-readiness.sh
```

El catálogo LIVE se sincroniza únicamente desde el borrador aprobado en Administración de
plataforma, durante la ventana de mantenimiento y con la confirmación Root descrita en
`deployment/README.md`. El script de escalones históricos está retirado.

La lista fiscal del segundo comando es un ejemplo. Debe contener únicamente los países que el
contador confirme como registros activos obligatorios para Índice. El script falla si una marca,
dominio, habilitación o registro no coincide.

## Webhook LIVE

```bash
STRIPE_SECRET_KEY_FILE=/root/indice-production/secrets/stripe-live-key \
STRIPE_WEBHOOK_SECRET_OUTPUT_FILE=/root/indice-production/secrets/stripe-live-webhook \
deployment/scripts/create-stripe-live-webhook.sh
```

La firma `whsec_` sólo se muestra una vez y queda en el archivo protegido. Si ya existe un endpoint,
el script se detiene: se debe usar el secreto existente o rotarlo desde Stripe.

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
4. Configurar y auditar cuenta, catálogo, impuestos y webhook LIVE.
5. Activar las variables finales y reiniciar únicamente backend/web.
6. Crear una cuenta interna con un correo nuevo y un plan de un producto.
7. Verificar en Stripe y root: tarjeta, trial de 15 días, cliente, suscripción, impuestos, empresa,
   propietario, cinco usuarios incluidos y seis módulos durante la prueba.
8. Reembolsar/cancelar la compra de control según corresponda y comprobar el evento de webhook.
9. Sólo entonces publicar el enlace de alta al mercado.

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

## Compuerta del almacenamiento automático

El runtime ya reserva automáticamente bloques de 5 GiB sin interrumpir la carga y sincroniza la
cantidad a Stripe sin prorrateo para la siguiente factura. LIVE permanece bloqueado hasta certificar
en TEST consentimiento, cargas simultáneas, reintentos del outbox, factura y reconciliación
Stripe/object storage.
