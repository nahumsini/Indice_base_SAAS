# Índice Stripe staging y accesos de cortesía

Estado: implementación para `apptest.indiceapp.com`. Producción permanece fuera de alcance hasta una promoción explícita.

## 1. Reglas comerciales aprobadas

- El registro comercial normal exige tarjeta aunque los primeros 30 días no tengan cargo.
- La prueba comienza al crear la cuenta mediante Stripe Checkout y ofrece 30 días completos.
- Stripe Tax calcula el impuesto desde la dirección fiscal; todos los precios son exclusivos de impuestos.
- Al terminar la prueba sin una suscripción vigente, la cuenta y sus datos se conservan 90 días en modo de solo lectura.
- Un código de cortesía creado por un administrador raíz puede omitir Stripe y la tarjeta. Puede limitarse por correo, productos, usuarios adicionales, vigencia, usos y campaña, o ser permanente.
- Los códigos se guardan como SHA-256. El valor legible se presenta una sola vez al crearlo.
- La primera consultoría de 50 minutos está incluida. Las adicionales cuestan USD 89 y son cargos separados, nunca parte de la mensualidad o del descuento anual.
- Cada plan incluye 5 empleados. Cada empleado adicional cuesta USD 12 al mes; en anual cuesta USD 144 por año, sin descuento adicional.
- La facturación anual aplica 20 % de descuento únicamente al paquete base.
- Se incluyen 5 GiB. Cada bloque adicional representa 1 GiB y cuesta USD 1 al mes o USD 12 al año. La medición y compra de bloques existe, pero la activación automática debe permanecer en observación hasta certificar reconciliación y facturación.
- Los precios de lanzamiento son tarifas de lealtad mientras la suscripción permanezca activa.

## 2. Catálogo de productos elegibles

Los seis productos básicos seleccionables son:

1. Recursos Humanos (`basic_hr`).
2. Tareas y Procesos (`basic_process_tasks`).
3. Expenses + Caja Chica (`basic_expenses`).
4. Punto de Venta + Inventarios (`basic_pos_inventory`).
5. Ventas + Inventarios (`basic_sales_inventory`).
6. Cartera (`basic_receivables`).

Punto de Venta + Inventarios y Ventas + Inventarios pueden contratarse juntos y cuentan como dos productos. La capacidad técnica `inventory` se proyecta una sola vez.

| Productos elegidos | Mensual | Anual, 20 % menos |
|---:|---:|---:|
| 1 | USD 69 | USD 662.40 |
| 2 | USD 109 | USD 1,046.40 |
| 3 | USD 149 | USD 1,430.40 |
| 4, 5 o 6 | USD 199 | USD 1,910.40 |

Los importes se almacenan en centavos y se resuelven desde `billing_catalog_prices`, no desde componentes React.

## 3. Arquitectura de staging

`apptest.indiceapp.com` debe apuntar exclusivamente al puerto local `127.0.0.1:8180`.

```text
Internet
  -> Apache/cPanel TLS para apptest.indiceapp.com
  -> 127.0.0.1:8180
  -> indice-apptest-web
       -> 127.0.0.1:8182 (backend)
       -> 127.0.0.1:8900 (MinIO)
       -> 127.0.0.1:8336 (MySQL)
```

El proyecto Compose `indice-apptest` tiene base de datos, volúmenes y contenedores independientes del runtime actual `indice-erp`. El VPS bloquea el acceso a redes bridge, por lo que staging usa la red host con puertos exclusivos ligados a `127.0.0.1`; no se reutilizan puertos, base de datos ni volúmenes y esos servicios no quedan publicados a Internet.

Archivo de runtime: `deployment/compose/docker-compose.staging.yml`.

Si el VPS no puede resolver los repositorios de Maven o npm, se usa el camino
offline: el JAR y `react/dist` se compilan y validan en la estación de despliegue,
se transfieren por SSH y se empaquetan con `Dockerfile.prebuilt`. Las imágenes
base deben ser las mismas versiones de JVM y nginx ya aprobadas en el VPS; no se
descargan dependencias durante esta operación.

La imagen web de staging se construye con:

```bash
docker build \
  --build-arg BASE_IMAGE=indice-erp-web:<tag-aprobado> \
  --build-arg NGINX_LISTEN_PORT=8180 \
  --build-arg BACKEND_UPSTREAM=127.0.0.1:8182 \
  --build-arg MINIO_UPSTREAM=127.0.0.1:8900 \
  -f deployment/docker/web/Dockerfile.prebuilt \
  -t indice-erp-web:<tag-apptest> .
```

## 4. Secretos y variables

El archivo real se conserva sólo en el VPS, propiedad de `root`, modo `0600`. Nunca se copia a Git.

Variables obligatorias:

```dotenv
APP_BILLING_STRIPE_ENABLED=true
APP_BILLING_STRIPE_MODE=test
APP_BILLING_STRIPE_SECRET_KEY=sk_test_...
APP_BILLING_STRIPE_WEBHOOK_SECRET=whsec_...
APP_BILLING_STRIPE_PROCESSOR_ENABLED=true
APP_BILLING_PROVISIONING_ENABLED=true

APP_BILLING_STRIPE_PRICE_BASIC_1_MONTHLY=price_...
APP_BILLING_STRIPE_PRICE_BASIC_1_ANNUAL=price_...
APP_BILLING_STRIPE_PRICE_BASIC_2_MONTHLY=price_...
APP_BILLING_STRIPE_PRICE_BASIC_2_ANNUAL=price_...
APP_BILLING_STRIPE_PRICE_BASIC_3_MONTHLY=price_...
APP_BILLING_STRIPE_PRICE_BASIC_3_ANNUAL=price_...
APP_BILLING_STRIPE_PRICE_BASIC_ALL_MONTHLY=price_...
APP_BILLING_STRIPE_PRICE_BASIC_ALL_ANNUAL=price_...
APP_BILLING_STRIPE_PRICE_EXTRA_SEAT_MONTHLY=price_...
APP_BILLING_STRIPE_PRICE_EXTRA_SEAT_ANNUAL=price_...
APP_BILLING_STRIPE_PRICE_STORAGE_BLOCK_MONTHLY=price_...
APP_BILLING_STRIPE_PRICE_STORAGE_BLOCK_ANNUAL=price_...
```

La llave publicable y el account ID no son utilizados por el checkout actual: la sesión la crea el backend y el navegador es redirigido a Stripe Checkout.

Los dos interruptores anteriores quedan en `false` durante el Paso A y sólo se
cambian a `true` después de validar la firma del webhook. Los valores mostrados
en esta sección representan el estado certificado actual de staging.

El catálogo TEST se crea de forma repetible con:

```bash
STRIPE_SECRET_KEY='sk_test_...' ./deployment/scripts/bootstrap-stripe-test-catalog.sh
```

El resultado contiene sólo Price IDs y puede incorporarse al archivo secreto del VPS. El script rechaza llaves que no sean `sk_test_`.

## 5. Secuencia de activación

### Paso A: infraestructura y checkout sin aprovisionamiento

1. Crear los productos y Price IDs en Stripe TEST.
2. Desplegar el backend y frontend en el proyecto `indice-apptest`.
3. Mantener inicialmente:

```dotenv
APP_BILLING_STRIPE_PROCESSOR_ENABLED=false
APP_BILLING_PROVISIONING_ENABLED=false
```

4. Confirmar:

```text
GET /api/v1/health                         -> HTTP 200
GET /api/v1/billing/signup/config         -> checkoutEnabled=true
                                             provisioningEnabled=false
```

5. Crear una sesión de Checkout y confirmar que:

- solicita tarjeta y dirección fiscal;
- usa Stripe Tax;
- muestra 30 días de prueba;
- selecciona los precios correctos para paquete e integrantes adicionales;
- no crea todavía la empresa.

### Paso B: webhook

Endpoint:

```text
POST https://apptest.indiceapp.com/api/v1/billing/stripe/webhook
```

Eventos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Guardar el `whsec_...` únicamente en el archivo secreto de staging. Un request sin firma o con firma inválida debe rechazarse.

### Paso C: aprovisionamiento completo

Después de verificar el endpoint y el procesamiento de eventos:

```dotenv
APP_BILLING_STRIPE_PROCESSOR_ENABLED=true
APP_BILLING_PROVISIONING_ENABLED=true
```

Recrear sólo el backend y verificar:

- checkout completado -> empresa, propietario y membresía creados una sola vez;
- seis productos disponibles durante la prueba, con capacidades duplicadas deduplicadas;
- plan y usuarios adicionales reflejados en el estado comercial;
- reintentos de webhook y de idempotencia no duplican clientes ni empresas;
- vencimiento de prueba -> `READ_ONLY` durante 90 días;
- pago recuperado -> `ACTIVE`;
- cancelación -> `READ_ONLY` durante 90 días.

## 6. Códigos de cortesía administrados por root

El panel raíz incorpora una sección para crear, copiar y revocar códigos. Requiere el permiso `PLATFORM_BENEFITS_WRITE`; `PLATFORM_ROOT` lo incluye.

Endpoints:

```text
GET    /api/v1/platform-admin/courtesy-codes
POST   /api/v1/platform-admin/courtesy-codes
DELETE /api/v1/platform-admin/courtesy-codes/{reference}
```

La creación admite:

- etiqueta y razón obligatorias;
- correo autorizado opcional;
- todos los productos básicos o una selección;
- usuarios adicionales incluidos;
- vigencia en días o permanente;
- máximo de redenciones;
- inicio, expiración y campaña.

Al usar el código en el registro:

1. No se llama a Stripe.
2. Se consume el código con bloqueo transaccional.
3. Se crea la misma estructura multitenant que en un alta pagada.
4. Se generan beneficios auditables por producto y asiento.
5. Se registra el ciclo comercial `courtesy` y su fecha de término.
6. Al vencer, pasa a lectura por 90 días; una cortesía permanente no tiene vencimiento automático.

La revocación impide usos futuros. Los accesos ya entregados se administran desde los beneficios de la empresa para evitar una baja accidental masiva.

## 7. Validación y seguridad

Validaciones mínimas antes de considerar staging listo:

```bash
./mvnw test
npm --prefix react run build
docker compose -f deployment/compose/docker-compose.staging.yml config --quiet
```

Además:

- inspeccionar logs sin imprimir secretos ni payloads completos;
- verificar que no exista `sk_test_`, `pk_test_` o `whsec_` en `git grep`;
- confirmar que sólo `127.0.0.1:8180` y `127.0.0.1:8182` estén expuestos por staging;
- confirmar que `app.indiceapp.com` y los contenedores `indice-erp-*` no cambiaron;
- probar un checkout mensual y uno anual;
- probar un código de cortesía de un uso, otro ligado a correo y uno revocado.

Como las llaves TEST se compartieron por chat, deben rotarse al cerrar la certificación de staging. Esto no afecta producción.

## 8. Certificación ejecutada el 2 de agosto de 2026

Versión desplegada: `be5fc2f2`, rama
`feature/stripe-staging-courtesy-2026-08-01`.

### Infraestructura y aislamiento

- `apptest.indiceapp.com/api/v1/health`, `/login` y `/platform-admin`
  respondieron HTTP 200.
- Apache dirige `apptest` a `127.0.0.1:8180`; producción continúa en
  `127.0.0.1:8080`.
- Web, backend, MySQL y MinIO de staging quedaron saludables y sin reinicios.
- Los puertos `8180`, `8182`, `8336`, `8900` y `8901` escuchan sólo en
  `127.0.0.1`.
- `app.indiceapp.com/api/v1/health` permaneció en HTTP 200. Las imágenes,
  identificadores y fechas de inicio de los contenedores de producción no
  cambiaron durante el despliegue.

### Stripe TEST y webhook

- Los trece precios TEST se contrastaron contra Stripe: importes, intervalo,
  moneda USD, `tax_behavior=exclusive`, estado activo y `livemode=false`.
- Stripe Tax quedó activo en TEST con el domicilio corporativo documentado y
  código fiscal de SaaS para uso empresarial.
- Un webhook sin firma respondió HTTP 400; un evento firmado respondió HTTP
  200 y se almacenó.
- Los eventos reales `customer.subscription.created` e `invoice.paid`
  enviados por Stripe llegaron al endpoint público y quedaron procesados.
- El mismo evento `checkout.session.completed` se reenvió y fue reconocido
  como duplicado sin crear una segunda empresa.

### Alta comercial certificada

- Se creó un cliente Stripe TEST con método de pago de prueba, suscripción
  `trialing`, 30 días exactos y Automatic Tax activo.
- El evento de finalización aprovisionó una sola empresa, propietario y
  membresía.
- La prueba entregó los seis productos básicos, cinco empleados y
  `5,368,709,120` bytes, equivalentes a 5 GiB.
- El propietario pudo iniciar sesión en `apptest` como `superadmin`.
- Un Checkout anual de tres productos más dos empleados verificó USD
  1,430.40 de paquete anual, USD 144 por empleado, tarjeta y dirección
  obligatorias, Automatic Tax y USD 0 a pagar al comenzar la prueba. La sesión
  se expiró al terminar la comprobación.

La automatización de navegador no estuvo disponible durante esta ejecución.
Por ello, antes de promover a producción permanece como compuerta manual abrir
una sesión alojada de Stripe Checkout, ingresar una tarjeta TEST y confirmar la
redirección visual a `/signup/complete`. La captura de tarjeta, la suscripción
TEST, los webhooks y el aprovisionamiento sí fueron certificados por API.

### Cortesía desde root

- Se habilitó un administrador `PLATFORM_ROOT` exclusivo de staging; sus
  credenciales se mantienen sólo en el VPS.
- Root creó dos códigos mediante la API usada por el panel y se generaron dos
  eventos de auditoría `COURTESY_CODE_CREATED`.
- El código temporal entregó los seis productos, dos asientos adicionales y 45
  días de acceso.
- El código permanente entregó solamente Cartera y no tiene fecha de
  vencimiento.
- Ambas cuentas se aprovisionaron e iniciaron sesión sin cliente, sesión ni
  suscripción de Stripe.

### Pruebas de código

Pasaron las suites dirigidas de selección comercial, registro, aprovisionamiento,
cortesía, administración de plataforma, suscripciones y ciclo comercial. La
prueba de ciclo comercial confirma que una prueba vencida entra en solo lectura
por 90 días y luego queda en `PURGE_PENDING` sin borrar automáticamente la
empresa. También pasaron la compilación React y la validación de Compose.

El barrido del contenido rastreado por Git no encontró llaves Stripe reales.
Los secretos, credenciales sintéticas y referencias de certificación viven
únicamente en archivos `0600` bajo `/root/indice-apptest`.

## 9. Rollback de staging

1. Guardar copia del archivo secreto, Compose y configuración Apache antes de cada cambio.
2. Reapuntar `apptest.indiceapp.com` al puerto anterior si el smoke test falla.
3. Detener sólo el proyecto aislado:

```bash
docker compose --env-file /root/indice-apptest/staging.env \
  -f /root/indice-apptest/source/deployment/compose/docker-compose.staging.yml down
```

4. No usar `down -v` durante un rollback normal; los volúmenes contienen los datos de prueba.
5. Restaurar la imagen anterior modificando `APP_IMAGE_TAG` y ejecutar `up -d`.

Producción sólo se promueve mediante una autorización separada, nuevas llaves live, Price IDs live, webhook live y un respaldo verificado.
