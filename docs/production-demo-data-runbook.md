# Runbook — Demos comerciales por industria basadas en datos

Fecha: 15 de agosto de 2026

Estado: guía operativa

Alcance: ambientes de demostración de Índice, incluidos ambientes productivos autorizados

## 1. Propósito

Este documento define cómo preparar una empresa demostrativa para ventas y pruebas funcionales sin modificar código, crear migraciones ni alterar la configuración global de la plataforma.

Una demo basada en datos debe permitir recorrer los flujos reales de Índice: empresa, estructura organizacional, catálogo, inventario, personas, operación, ventas y finanzas. No se trata de llenar tablas aisladas. Los módulos deben contar la misma historia y conservar trazabilidad entre sí.

El resultado esperado es una empresa ficticia pero creíble, lista para una demostración comercial repetible y segura.

## 2. Regla principal

> La demo agrega información sintética dentro de los contratos existentes; no cambia el comportamiento del producto.

Por lo tanto, una carga de demo:

- no modifica código fuente, migraciones ni imágenes desplegadas;
- no agrega columnas, tablas, estados o permisos inexistentes;
- no cambia datos de otras empresas;
- no utiliza datos personales, fiscales, bancarios o comerciales reales;
- no intenta corregir mediante datos una falla que pertenece al código;
- usa las relaciones y reglas que usa la interfaz;
- puede identificarse, repetirse, validarse y retirarse de forma controlada.

## 3. Frontera de seguridad

### 3.1 Autorización

La carga en producción necesita autorización explícita para:

1. la empresa destino;
2. los módulos que se poblarán;
3. el volumen y periodo de datos;
4. cualquier creación de usuarios o credenciales temporales.

La autorización para crear una demo no autoriza cambios de código, despliegues, eliminación de datos ajenos ni modificaciones globales.

### 3.2 Aislamiento por empresa

Toda consulta y mutación debe estar acotada por `company_id`. Cuando el registro tenga alcance organizacional, también debe conservar `unit_id` y `business_id`.

Antes de ejecutar, se debe demostrar que la empresa se resolvió exactamente una vez:

```sql
SELECT id, name
FROM companies
WHERE LOWER(name) = LOWER(@demo_company_name);
```

Si el resultado es cero o más de una fila, la carga debe detenerse.

### 3.3 Datos sintéticos

Todos los datos deben estar marcados como ficticios. Se recomienda conservar una etiqueta estable en `metadata_json`:

```sql
JSON_OBJECT(
  'seed', 'demo-<industria>-v1',
  'fictional', TRUE,
  'generatedBy', 'IndiceDemoSeed'
)
```

Correos de empleados y contactos pueden utilizar dominios reservados como `.example`. Los RFC, teléfonos, cuentas, comprobantes y referencias también deben ser claramente sintéticos.

### 3.4 Secretos

Las contraseñas y secretos de base de datos se obtienen del entorno autorizado. Nunca deben escribirse en el archivo SQL, imprimirse en consola, guardarse en el repositorio ni incluirse en este runbook.

## 4. Modelo de trazabilidad

La empresa demo debe respetar esta cadena:

```text
Empresa
└── Unidad de negocio
    └── Negocio o centro operativo
        ├── Almacenes
        │   ├── existencias
        │   ├── cajas POS
        │   └── kioskos operacionales
        ├── colaboradores y responsables
        ├── clientes y proveedores
        └── operación
            ├── ventas y entregas
            ├── crédito y cartera
            ├── gastos y presupuestos
            └── procesos y tareas
```

Las relaciones mínimas son:

- una venta pertenece a una empresa y conserva unidad, negocio, cliente y vendedor;
- una venta de producto inventariable se origina en un almacén y afecta sus existencias;
- una caja pertenece a un almacén; el usuario responde por la sesión, no por la existencia de la caja;
- un kiosko es una carátula operacional enlazada al alcance que monitorea o atiende;
- una venta a crédito se origina en una venta válida y produce cuenta, parcialidades y, cuando aplique, abonos;
- un gasto conserva proveedor, cuenta contable, cuenta de pago, responsable y alcance organizacional;
- una tarea pertenece a un proceso y tiene un responsable que existe dentro de la misma empresa.

## 5. Ficha de diseño de la industria

Antes de escribir SQL se completa esta ficha:

| Decisión | Ejemplo industrial | Pregunta de diseño |
|---|---|---|
| Giro | Distribución de acero y aluminio | ¿Qué vende y cómo obtiene margen? |
| País, moneda e impuestos | México, MXN, IVA | ¿Qué reglas locales debe reflejar? |
| Unidad y negocio | Operación Monterrey / Centro Apodaca | ¿Dónde ocurre la operación? |
| Almacenes | Apodaca, Guadalupe, corte | ¿Dónde existe o se prepara el producto? |
| Catálogo | PTR, lámina, placa y aluminio | ¿Qué compra el cliente? |
| Tipo de inventario | Por pieza y almacén | ¿Qué productos descuentan stock? |
| Clientes | Talleres, constructoras y fabricantes | ¿Quién compra y con qué frecuencia? |
| Proveedores | Acereras, extrusores y logística | ¿Quién abastece y en qué condiciones? |
| Equipo | Caja, bodega, ventas, choferes y dirección | ¿Quién ejecuta cada flujo? |
| Ciclo comercial | Cotización, venta, entrega y crédito | ¿Cómo se convierte una oportunidad en cobro? |
| Gastos | Material, flete, combustible y renta | ¿Qué costos explican la operación? |
| Procesos | Cotizar, surtir, entregar y cobrar | ¿Qué trabajo puede demostrarse? |
| Fecha de corte | Fecha vigente de la demo | ¿Qué está vencido, por vencer o al corriente? |

La ficha es el contrato narrativo. Si un registro no ayuda a demostrar esa historia, probablemente no debe cargarse.

## 6. Paquete mínimo por industria

### 6.1 Identidad y estructura

Crear o validar:

- empresa demo;
- usuario administrador nominal;
- membresía activa y alcance;
- unidad de negocio;
- negocio o centro operativo;
- módulos y pestañas necesarios.

Los IDs deben resolverse por claves estables y validarse. No se deben copiar IDs de otra base suponiendo que serán iguales.

### 6.2 Catálogo e inventarios

El catálogo debe incluir variedad suficiente para buscar, filtrar, cotizar y vender. Como referencia comercial:

- 20 a 40 productos para una industria de distribución;
- 8 a 15 artículos para una demo de restaurante;
- 10 a 25 servicios para una empresa profesional;
- categorías, unidades, costos, precios e impuestos consistentes;
- productos inventariables y, cuando el giro lo requiera, servicios o productos inagotables;
- existencias por almacén, reservas y mínimos creíbles;
- movimientos de apertura que expliquen el saldo inicial.

Invariantes:

```text
disponible >= 0
reservado >= 0
stock físico >= disponible + reservado
costo <= precio, salvo un caso narrativo deliberado
producto inventariable -> saldo por almacén
servicio o digital -> no descuenta existencias
```

### 6.3 Clientes y proveedores

Crear clientes acordes al sector y proveedores suficientes para explicar compras, gastos y abastecimiento.

Cada contacto debe tener:

- nombre comercial ficticio;
- persona de contacto;
- correo y teléfono sintéticos;
- ciudad o zona;
- condición comercial;
- metadatos de demo.

Evitar nombres genéricos como “Cliente 1” si la demo busca credibilidad comercial.

### 6.4 Personas, nómina y asistencia

Diseñar la plantilla a partir del flujo operativo. Un distribuidor industrial puede requerir caja, bodega, ventas, choferes, gerencia, asistencia y dirección. Un restaurante requiere meseros, cocina, caja y supervisión.

La demo puede incluir:

- usuarios o expedientes de empleados ficticios;
- puesto y departamento;
- sueldo y periodicidad;
- perfil fiscal sintético;
- horario;
- asistencia histórica;
- incidencias pequeñas y creíbles.

La nómina debe cuadrar con sus percepciones, deducciones y neto. La asistencia no debe colocar a una persona en dos sitios al mismo tiempo.

### 6.5 Finanzas, gastos y presupuesto

Preparar primero las referencias:

- cuentas de pago;
- cuentas contables;
- proveedores;
- presupuesto y líneas;
- responsables.

Después crear gastos de periodos recientes y un presupuesto futuro. Conviene mezclar:

- pagados y auditados;
- aprobados pendientes de pago;
- parcialmente pagados;
- por aprobar;
- vencidos, únicamente cuando sirvan para explicar una alerta.

Invariantes:

```text
total = subtotal + impuestos
saldo = total - pagado
presupuesto disponible = planeado - comprometido - ejercido
gasto pagado -> fecha y cuenta de pago
```

### 6.6 Caja chica

Un fondo de caja chica completo contiene:

- fondo y cuenta de pago asociada;
- responsable;
- límite y saldo actual;
- corte mensual;
- movimientos de asignación, devolución o reposición;
- comprobaciones;
- gastos vinculados a las comprobaciones.

El historial debe explicar el saldo:

```text
saldo actual = fondos recibidos - gastos - devoluciones +/- ajustes
estimado del corte = suma de comprobaciones
verificado del corte = suma de gastos autorizados
```

Para transporte son útiles gasolina, diésel, casetas, estacionamiento, lavado, lubricación y reparaciones menores. No deben presentarse comprobantes inexistentes como archivos adjuntos reales.

### 6.7 Ventas y POS

Crear una mezcla temporal que permita contar una historia:

- ventas concluidas del mes anterior;
- ventas del mes vigente;
- una operación en preparación;
- una entrega pendiente;
- pagos de contado, transferencia y crédito;
- márgenes y comisiones coherentes;
- líneas de venta que existan en el catálogo.

Una caja POS debe estar ligada a un almacén. Puede haber varias cajas abiertas simultáneamente en almacenes distintos, pero una sesión de usuario debe respetar las reglas vigentes de apertura y cierre.

No se debe insertar una venta de producto inventariable sin decidir si la demo requiere el movimiento de inventario correspondiente.

### 6.8 Crédito y cartera

La cartera se construye a partir de ventas existentes; no se deben duplicar ventas sólo para mostrar cuentas por cobrar.

Orden recomendado:

1. política de crédito del cliente;
2. venta a crédito vinculada a `sales_record_id` o ticket POS;
3. cuenta por cobrar;
4. parcialidades;
5. abonos;
6. actualización de saldo y crédito disponible.

Invariantes:

```text
total por cobrar = suma de parcialidades
pagado de la cuenta = suma de abonos = suma pagada en parcialidades
saldo de la cuenta = total por cobrar - pagado
saldo de la cuenta = suma del saldo de parcialidades
crédito disponible = línea - capital utilizado + capital recuperado
```

La cartera comercial debe mostrar variedad: una cuenta vencida, una próxima a vencer, cuentas al corriente y alguna parcialidad pagada. Las fechas se calculan contra la fecha real de la demostración.

### 6.9 Procesos y tareas

Los procesos deben reflejar el giro, no ser una lista decorativa. Ejemplos industriales:

- seguimiento de cotizaciones;
- validación de crédito;
- preparación y surtido;
- programación de entregas;
- cobranza;
- cierre semanal de operación.

Cada proceso necesita tareas con responsable, prioridad, fecha, estado y resultado esperado. Las tareas administrativas deben asignarse a usuarios administrativos; las operativas, a los roles que realmente las ejecutarían.

### 6.10 Kioskos

Los kioskos son superficies operacionales, no copias independientes de los datos. Se crean cuando ayudan a demostrar un canal:

- pantalla de cliente POS;
- autoservicio;
- asistencia;
- tareas;
- caja chica;
- proveedores.

El kiosko conserva empresa, unidad, negocio, almacén o caja según su dominio. El módulo propietario sigue siendo la fuente de verdad.

## 7. Orden de carga recomendado

El orden reduce referencias rotas:

1. empresa, administrador y membresía;
2. unidad y negocio;
3. permisos de módulos y pestañas;
4. almacenes y cuentas base;
5. catálogo, proveedores y clientes;
6. inventario y movimientos de apertura;
7. empleados, perfiles, horarios y asistencia;
8. cuentas contables, cuentas de pago y presupuesto;
9. gastos y caja chica;
10. ventas, entregas y movimientos de inventario;
11. políticas de crédito, cartera, parcialidades y abonos;
12. procesos y tareas;
13. cajas, sesiones y kioskos que requiera el relato;
14. validación técnica y recorrido visual.

## 8. Patrón de implementación SQL

### 8.1 Guardia de ambiente

Cada script debe rechazar producción salvo que exista una bandera explícita:

```sql
SET @allow_production_demo := COALESCE(@allow_production_demo, 0);

DELIMITER //
CREATE PROCEDURE assert_demo_target()
BEGIN
  IF DATABASE() = 'produccion' AND @allow_production_demo <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Production demo flag is required';
  END IF;

  IF @target_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM companies WHERE id = @target_company_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A valid target company is required';
  END IF;
END//
DELIMITER ;
```

El nombre real de la base no debe quedar como ejemplo reutilizable sin revisión; cada ambiente define su propia lista permitida.

### 8.2 Prefijo y marcador

Usar un prefijo por industria y versión:

```text
DEMO-MTY-*        distribución industrial Monterrey
DEMO-RST-*        restaurante
DEMO-RTL-*        retail
DEMO-SVC-*        servicios profesionales
```

Las claves visibles ayudan a soporte; `metadata_json.seed` es la autoridad para validar y retirar la carga.

### 8.3 Idempotencia

Un script repetible puede usar una de estas estrategias:

- `INSERT ... ON DUPLICATE KEY UPDATE` cuando existe una clave natural segura;
- borrado y recreación exclusivamente de filas con el mismo marcador de demo;
- actualización por código estable dentro de la misma empresa.

Nunca usar un `DELETE` amplio por nombre parcial. El borrado debe incluir `company_id` y el marcador exacto.

### 8.4 Tablas temporales

Las tablas temporales facilitan catálogos y calendarios sin dejar objetos permanentes:

```sql
CREATE TEMPORARY TABLE tmp_demo_products (...);
INSERT INTO tmp_demo_products VALUES (...);

INSERT INTO sales_products (...)
SELECT ...
FROM tmp_demo_products;

DROP TEMPORARY TABLE tmp_demo_products;
```

### 8.5 Transacción

Las mutaciones se ejecutan dentro de una transacción. Primero se debe ensayar el mismo script con `ROLLBACK`:

```sql
START TRANSACTION;
-- carga completa
-- consultas de verificación
ROLLBACK;
```

Después de confirmar que el ensayo termina sin residuos, se ejecuta nuevamente con `COMMIT`.

Algunas operaciones DDL pueden causar commits implícitos. Por eso los scripts de datos deben evitar crear o modificar objetos permanentes.

## 9. Procedimiento de producción

### Fase A — Descubrimiento de sólo lectura

1. Confirmar rama y versión desplegada.
2. Identificar empresa, administrador, unidad y negocio.
3. Revisar `SHOW COLUMNS`, índices, claves foráneas y restricciones de estado.
4. Consultar registros actuales y prefijos existentes.
5. Confirmar responsables, cuentas, almacenes, clientes y proveedores válidos.
6. Revisar los repositorios o servicios del backend para reproducir sus efectos laterales.

No se debe diseñar una inserción usando solamente la apariencia del frontend.

### Fase B — Respaldo

Antes de cualquier escritura:

```bash
mysqldump \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --no-tablespaces \
  "$DATABASE" | gzip -9 > "pre_demo_$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

gzip -t pre_demo_*.sql.gz
```

Además de `gzip -t`, verificar que el final del archivo contenga la marca de terminación de `mysqldump`. Registrar ruta, tamaño y fecha.

### Fase C — Ensayo reversible

1. Ejecutar la carga completa dentro de `START TRANSACTION`.
2. Consultar conteos, montos y relaciones.
3. Ejecutar `ROLLBACK`.
4. Confirmar que los conteos del marcador regresaron al valor inicial.

### Fase D — Aplicación

1. Ejecutar la misma carga con `COMMIT`.
2. No cambiar el SQL entre el ensayo y la aplicación, salvo la instrucción final.
3. Conservar la salida de métricas.

### Fase E — Validación

Validar al menos:

- conteo por entidad y marcador;
- sumas financieras;
- claves foráneas y registros huérfanos;
- `JSON_VALID` en metadatos y campos personalizados;
- saldos de inventario;
- ventas y movimientos asociados;
- cuentas por cobrar, parcialidades y abonos;
- responsables y alcance organizacional;
- salud pública del backend;
- estado y reinicios de los contenedores;
- recorrido visual con el usuario demo.

La salud del backend debe consultarse en el endpoint real del proyecto; un `200` que devuelve el HTML del frontend no demuestra salud de la API.

## 10. Consultas de control

### 10.1 Aislamiento

```sql
SELECT company_id, COUNT(*)
FROM <tabla>
WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.seed')) = @seed
GROUP BY company_id;
```

Sólo debe aparecer la empresa autorizada.

### 10.2 JSON

```sql
SELECT COUNT(*) AS invalid_json
FROM <tabla>
WHERE company_id = @target_company_id
  AND JSON_VALID(metadata_json) = 0;
```

### 10.3 Cartera

```sql
SELECT
  SUM(ABS(account.total_payable_amount
        - account.paid_amount
        - account.balance_amount) > 0.001) AS account_mismatches
FROM finance_receivable_accounts account
WHERE account.company_id = @target_company_id;
```

También se debe comparar la cuenta con la suma de sus parcialidades y abonos.

### 10.4 Caja chica

```sql
SELECT statement.id,
       statement.estimated_usage_amount,
       statement.verified_expense_amount,
       SUM(line.total_amount) AS line_total
FROM finance_petty_cash_statements statement
JOIN finance_petty_cash_settlement_lines line
  ON line.petty_cash_statement_id = statement.id
WHERE statement.company_id = @target_company_id
GROUP BY statement.id;
```

### 10.5 Inventario

```sql
SELECT warehouse_id, product_id,
       available_quantity, reserved_quantity
FROM sales_inventory_balances
WHERE company_id = @target_company_id
  AND (available_quantity < 0 OR reserved_quantity < 0);
```

La consulta debe regresar cero filas, salvo que el producto admita explícitamente inventario negativo.

## 11. Perfiles sugeridos por industria

| Industria | Catálogo | Operación clave | Finanzas | Personal | Kioskos o POS |
|---|---|---|---|---|---|
| Distribución industrial | materiales, medidas y presentaciones | almacén, corte, surtido y entrega | compras, fletes, crédito y cobranza | ventas, bodega y choferes | caja, pantalla cliente y proveedor |
| Restaurante | platillos, bebidas, modificadores y combos | mesas, comandas, cocina y entrega | caja diaria, insumos y propinas | meseros, cocina y caja | autoservicio, cocina y pantalla cliente |
| Retail | variantes, códigos de barras y promociones | recepción, piso, caja y devolución | cortes, descuentos y ticket promedio | cajeros y supervisores | POS y pantalla cliente |
| Servicios profesionales | servicios, paquetes y horas | oportunidad, propuesta, proyecto y entrega | anticipos, hitos y cartera | consultores y administración | formularios o agenda |
| Productos digitales | licencias, planes y renovaciones | alta, entrega digital y soporte | recurrente, crédito o suscripción | ventas y soporte | catálogo público |
| Estacionamientos | tarifas, pensiones y convenios | acceso, estancia, cobro y salida | cajas, cortes y convenios | operadores y supervisión | kiosko de acceso o pago |

Cada perfil reutiliza el mismo método, pero cambia la narrativa, las unidades, los roles, los estados y los indicadores.

## 12. Guion comercial de verificación

Una demo completa debe poder recorrerse sin explicar inconsistencias:

1. entrar como administrador de la empresa demo;
2. mostrar la unidad, el negocio y los almacenes;
3. buscar productos y consultar existencias;
4. abrir una venta o recorrer una venta existente;
5. identificar vendedor, cliente, almacén y margen;
6. mostrar una venta de contado y otra a crédito;
7. abrir cartera, revisar vencimientos y registrar o consultar un abono;
8. revisar gastos, presupuesto y caja chica;
9. mostrar colaboradores, asistencia y nómina;
10. abrir procesos y tareas relacionadas con la operación;
11. mostrar cajas o kioskos únicamente si forman parte del relato;
12. cerrar con KPIs que puedan rastrearse hasta registros visibles.

Si el presentador necesita justificar por qué dos módulos no coinciden, la demo todavía no está terminada.

## 13. Caso de referencia: distribución de acero y aluminio

El ejercicio de referencia utilizó:

- empresa industrial ficticia con administrador nominal;
- una unidad y un centro operativo;
- 30 productos de acero y aluminio;
- tres almacenes con existencias y reservas;
- clientes y proveedores industriales;
- 17 colaboradores entre caja, bodega, ventas, reparto y dirección;
- nómina fiscal sintética y asistencia histórica;
- gastos de julio y agosto y presupuesto para el resto del año;
- ventas históricas y vigentes;
- caja chica para reparto y traslados administrativos;
- ventas a crédito con cuentas, parcialidades, vencimientos y abonos;
- procesos y tareas para personal administrativo y operativo.

La lección principal fue que el orden de carga importa menos que la coherencia final, pero respetar dependencias reduce considerablemente el riesgo y el retrabajo.

## 14. Caso de referencia: supermercado y tienda departamental

La demo productiva de referencia para retail de gran formato utiliza la empresa `Supermercados Horizonte 360 Demo` y el marcador `supermarket-demo-v1`. Su acceso administrativo se identifica con `demo.supermercado@indiceapp.com`; la contraseña temporal se entrega exclusivamente por un canal autorizado y no forma parte de este documento.

La historia comercial contempla seis tiendas en el área metropolitana de Monterrey:

1. Cumbres Monterrey;
2. Universidad San Nicolás;
3. Concordia Apodaca;
4. Linda Vista Guadalupe;
5. La Fama Santa Catarina;
6. Sendero Escobedo.

Cada tienda conserva su propia unidad, negocio, almacén y caja POS. La plantilla contiene exactamente 20 colaboradores por tienda, con gerencia, supervisión, seis cajeros, personal de piso, auxiliares de almacén, especialistas de frescos y panadería, prevención de pérdidas y servicios generales.

El catálogo contiene 2,000 productos, distribuidos uniformemente en 20 departamentos —100 artículos por departamento—:

- abarrotes, frutas y verduras, carnes y pescados, lácteos, panadería, congelados, bebidas y botanas;
- limpieza, higiene y belleza, farmacia, bebés, mascotas y hogar;
- electrónica, línea blanca, ropa y calzado, papelería, juguetería y ferretería/automóvil.

La carga de referencia incluye:

| Entidad | Cantidad |
|---|---:|
| Tiendas, unidades, negocios, almacenes y cajas | 6 de cada uno |
| Colaboradores | 120 |
| Productos | 2,000 |
| Saldos de inventario por tienda | 12,000 |
| Proveedores | 40 |
| Relaciones producto-proveedor | 2,000 |
| Clientes | 60 |
| Ventas de julio y agosto de 2026 | 360 |
| Ventas activas a crédito | 18 |
| Gastos operativos | 72 |
| Líneas presupuestales y fondos de caja chica | 6 de cada uno |
| Procesos y proyectos | 24 de cada uno |
| Tareas | 96 |
| Módulos básicos habilitados | 10 |

Validaciones obligatorias para repetir este caso:

- `MIN(productos_por_departamento) = MAX(productos_por_departamento) = 100`;
- `MIN(empleados_por_tienda) = MAX(empleados_por_tienda) = 20`;
- cada producto tiene un saldo en cada uno de los seis almacenes;
- cada caja apunta al almacén de su misma tienda;
- ningún saldo disponible o reservado es negativo;
- ventas, crédito, gastos, procesos y tareas conservan empresa, unidad y negocio;
- las consultas autenticadas de catálogo, cajas, proveedores, procesos y cartera responden correctamente.

Registro de la ejecución inicial:

```text
Empresa: Supermercados Horizonte 360 Demo
Ambiente: Producción
Fecha y zona horaria: 15 de agosto de 2026, America/Toronto
Seed y versión: supermarket-demo-v1
Periodo simulado: julio y agosto de 2026
Resultado del ensayo: ROLLBACK correcto y cero residuos
Resultado de la aplicación: COMMIT correcto
Salud de API: HTTP 200
Observación: información totalmente sintética; no se modificó código
```

## 15. Retiro y reversión

El retiro ordinario usa el marcador de demo, en orden inverso a las dependencias:

1. archivos, abonos y detalles hijos;
2. parcialidades y cuentas por cobrar;
3. ventas a crédito y políticas;
4. tareas y procesos;
5. comprobaciones y movimientos de caja chica;
6. gastos;
7. ventas y movimientos de inventario;
8. saldos, productos y almacenes;
9. asistencia, nómina y empleados;
10. clientes, proveedores y cuentas creadas por la demo;
11. estructura y usuario, sólo si no tienen datos ajenos al paquete.

No se debe eliminar una empresa completa para retirar una demo parcial. La restauración del respaldo completo es el último recurso y requiere una ventana operativa y autorización independiente.

## 16. Registro de ejecución

Cada carga debe dejar este resumen fuera de la base de datos:

```text
Empresa:
Ambiente:
Fecha y zona horaria:
Responsable:
Seed y versión:
Módulos poblados:
Conteos principales:
Totales financieros:
Periodo simulado:
Ruta del respaldo:
Prueba con rollback:
Validaciones:
Salud de API:
Recorrido visual:
Observaciones y datos pendientes:
```

## 17. Criterio de terminado

- [ ] Existe autorización explícita y empresa destino inequívoca.
- [ ] Se generó y verificó un respaldo previo.
- [ ] Toda la información es sintética y está marcada.
- [ ] La carga es idempotente o tiene un retiro acotado.
- [ ] El ensayo con `ROLLBACK` no dejó residuos.
- [ ] Catálogo, inventario, ventas y finanzas cuadran.
- [ ] RH, asistencia y tareas tienen responsables válidos.
- [ ] Caja chica y cartera pasan sus ecuaciones de saldo.
- [ ] No existen referencias huérfanas ni JSON inválido.
- [ ] El backend responde correctamente y no presenta reinicios inesperados.
- [ ] La interfaz muestra la historia esperada con el usuario demo.
- [ ] No se modificó código ni se desplegó una versión nueva.
