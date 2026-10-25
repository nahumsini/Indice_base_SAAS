# México: auditoría de cobertura de nómina — 2026-10-25

Estado: **diagnóstico y plan de cierre; no liberación ni certificación fiscal**.

Actualización de implementación (25 de octubre, posterior al diagnóstico): se incorporaron
perfiles fiscales por vigencia, SBC registrado, límites y excepciones ordinarias de IMSS,
retenciones INFONAVIT por aviso y controles de aprobación. El estado implementado, sus pruebas
y las carencias pendientes están en el
[contrato de perfiles y retenciones](mexico-payroll-profile-contract-v1.md).
Los hallazgos y reproducciones siguientes conservan la **línea base anterior a esas correcciones**;
no deben usarse para atribuir al código nuevo un comportamiento que ya cambió.

Solicitud vigente: analizar primero la cobertura completa de México, incluyendo todas las
entidades y tipos de nómina. Se revisaron código local actual, reglas migradas, pruebas y
fuentes oficiales consultadas el 25 de octubre de 2026.

## Resultado y alcance

El motor actual no está listo para declararse una solución fiscal completa para México.
Las advertencias visibles describen carencias reales. Quitar avisos o actualizar porcentajes
no resuelve las bases de cálculo, elegibilidad ni cierres.

La separación fiscal / operativa / sin nómina existe. Esta clasificación de producto no
determina las obligaciones legales de una relación laboral: “operativa” no es una exención
legal de impuestos, seguridad social ni prestaciones.

Esta revisión cubre el inventario funcional y riesgos federales principales. **La validación
normativa detallada de los 32 estados y de regímenes especiales permanece pendiente.**
Las tasas no verificadas no se inventaron. Se documentan requisitos propuestos, no decisiones
ya implementadas. No se cambió el comportamiento del sistema durante esta auditoría.

## Hallazgos comprobados

Evidencia principal: [proveedor México](../../src/main/java/com/indice/erp/hr/payroll/provider/mx/MexicoPayrollProvider.java),
[motor común](../../src/main/java/com/indice/erp/hr/payroll/engine/PayrollCalculationEngine.java),
[servicio de Nómina](../../src/main/java/com/indice/erp/hr/payroll/HrPayrollService.java),
[acumulador fiscal](../../src/main/java/com/indice/erp/hr/payroll/engine/PayrollFiscalAccumulatorService.java).
Los símbolos indicados permiten localizar el hallazgo aunque cambien las líneas.

| ID | Comportamiento en la línea base y evidencia | Consecuencia |
| --- | --- | --- |
| MX-01 | calculateLine del proveedor no aplica subsidio; calculationWarnings reconoce que falta. | Retención excesiva a trabajadores elegibles; faltan elegibilidad y cierre mensual. |
| MX-02 | SBC derivado de percepción gravada por factor general. loadCountryPayrollProfile devuelve vacío fuera de CO. | No usa SBC individual registrado, salario variable/mixto ni movimientos. Bonos y faltas alteran la estimación. |
| MX-03 | contributionDailyBase usa UMA como piso; employeeImss no distingue salario mínimo. | Confunde indicadores y no reconoce excepciones de cuota obrera. |
| MX-04 | resolvePayPeriodBaseDays usa 30.4 para cuotas mensuales; UMA por fin del periodo; mismos días para todas las ramas. | No representa calendario, altas/bajas, vigencias ni efectos específicos de incapacidades/ausencias. |
| MX-05 | calculateLine del motor omite el proveedor si la base ISR es cero. | Puede omitir seguridad social de una persona todavía registrada. |
| MX-06 | overtimeMultiplier devuelve 1.0 para MX; baseCompensationItems no agrega horas extra a salario fijo. | Pago de extras insuficiente o ausente. |
| MX-07 | No hay percepciones mexicanas automáticas por descanso/festivo trabajado, prima dominical o descanso proporcional en pago por hora. | El conteo de asistencia no representa todos los derechos remunerados. |
| MX-08 | Una sola base; percepciones fiscales exentas o fuera de seguridad social se rechazan. | La contención evita gravarlas silenciosamente, pero no implementa prestaciones con bases separadas. |
| MX-09 | Riesgo patronal general 1%; ISN general 3% sobre base ISR, sin seleccionar estado. | Costo patronal estimado; no liquidación estatal validada. |
| MX-10 | resolveRcvEmployerRate busca sólo múltiplos de UMA. | Falta representar y validar la franja en salario mínimo, límites y vigencias CEAV. |
| MX-11 | Existe aportación patronal INFONAVIT, pero no retención mexicana de crédito por aviso. infonavit_user_rate sólo es consumida por el proveedor genérico. | La preferencia editable no produce el cálculo prometido para MX. |
| MX-12 | No se encontró motor MX específico de aguinaldo, vacaciones/prima, PTU, finiquito o indemnización. | Ajustes manuales genéricos no sustituyen derechos, exenciones y acumulados. |
| MX-13 | Acumulador anual por fechas de periodo y estados processed/approved/paid. | No es libro mexicano de pagos efectivos ni resuelve varios pagos, cierre mensual y ajuste anual. |
| MX-14 | statutoryCompliance=true sólo reconoce proveedor soportado. ensureStatutoryComplianceForApproval bloquea el genérico, no las carencias mexicanas. | Una nómina fiscal incompleta puede superar ese control. |
| MX-15 | No se encontró implementación backend de CFDI Nómina, PAC, UUID ni cancelación/sustitución. | Aprobar/pagar/imprimir no equivale a timbrar. |
| MX-16 | Textos isrHint/mexicoOverview describen subsidio e INFONAVIT como disponibles. | La interfaz comunica más cobertura de la implementada. |

MX-09 se verificó también en [V84](../../src/main/resources/db/migration/V84__payroll_statutory_rule_sets.sql)
y [V361](../../src/main/resources/db/migration/V361__payroll_mx_complete_ordinary_social_contributions.sql).
MX-12/MX-15 proceden de búsqueda y seguimiento de rutas en backend y migraciones; las novedades
de liquidación del proveedor colombiano no son implementación mexicana.
MX-16: [traducciones](../../react/src/app/BasicModules/HumanResources/Payroll/translations/es-MX.ts)
y [preferencias](../../react/src/app/BasicModules/HumanResources/Payroll/Payroll.tsx).

## Reproducción con datos ficticios

Se ejecutaron siete pruebas diagnósticas contra el motor y las reglas migradas reales.
**Su éxito significa que se reprodujeron las carencias, no que el cálculo sea legalmente correcto.**

| Caso | Resultado actual reproducido | Lectura |
| --- | --- | --- |
| Sueldo semanal fijo $7,500 | ISR $1,167.18; IMSS empleado $208.53 | Reproduce los importes de la captura; todavía no demuestra que el SBC individual sea correcto. |
| Semanal $2,205.28, equivalente a 7 × $315.04 | ISR $157.27; IMSS empleado $54.96 | No existen los datos/reglas para reconocer las excepciones de salario mínimo. Aplican sólo cuando se cumplen sus supuestos legales. |
| Por hora: 10 extras a $100 | $1,000 de extras | El motor paga factor 1.0. En un supuesto 2026 válido de 9 dobles y 1 triple serían $2,100 antes del tratamiento fiscal. |
| Fijo: $7,500 y 10 extras | $0 de percepción adicional por extras | No se liquidan en la rama de salario fijo. |
| Mensual $30,000: febrero 28 días frente a marzo 31 días, sin incidencias | IMSS empleado $830.76 en ambos | El proveedor utiliza 30.4 en ambos; falta calendario real de cuotas y SBC registrado. |
| Base $7,500 en MX-ROO y MX-NLE | ISN $225 en ambos | La jurisdicción no cambia la regla. Contraste simple QR al 4%: $300 si toda esa base es gravable localmente, antes de condiciones especiales. |
| Fijo $7,500, seis faltas de seis días de control | Aportaciones patronales $0 y statutoryCompliance=true | Base gravada cero omite el proveedor; no evalúa continuidad de aseguramiento. |

La diferencia de un centavo entre el ISR semanal publicado y el método mensual prorrateado
para $7,500 no se usa como prueba aislada de ilegalidad. Debe elegirse un procedimiento permitido
y documentar sus redondeos/cierre; las carencias estructurales anteriores son más relevantes.

## Fuentes oficiales y reglas que condicionan el diseño

### ISR y subsidio

La [LISR, arts. 93 y 95–99](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf)
distingue ingresos exentos, pagos por separación, retenciones, cierre anual y comprobantes.
El ajuste anual tiene excepciones; no debe ejecutarse indiscriminadamente.
El [artículo 96 publicado por SAT](https://wwwmat.sat.gob.mx/articulo/36534/articulo-96)
prevé la excepción de retención cuando se percibe únicamente salario mínimo en los términos legales.

El [Anexo 8 RMF 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Anexo-8-RMF-2026_DOF-28122025.pdf)
contiene tarifas por periodicidad. Se debe documentar el procedimiento adoptado, considerando
[RLISR 176](https://wwwmat.sat.gob.mx/articulo/56678/articulo-176) y
[RLISR 174 para pagos extraordinarios](https://wwwmatnp.sat.gob.mx/articulo/46306/articulo-174).

El [decreto de subsidio 2026](https://sidof.segob.gob.mx/notas/docFuente/5777649)
establece ingreso mensual máximo de $11,492.66 y 15.02% de UMA mensual, con 15.59% para enero.
Los periodos menores al mes requieren proporción y límite acumulado mensual.
No corresponde restar una constante repetida en cada corrida. Falta cerrar condiciones del
decreto original, elección entre empleadores, pagos extraordinarios y ajustes aplicables.

### Seguridad social y salario mínimo

La [LSS, arts. 27–39 y 168 y transitorios](https://www.imss.gob.mx/sites/all/statics/pdf/leyes/LSS.pdf)
distingue integración/movimientos de SBC, calendario y efectos de ausencias/incapacidades.
Su artículo 36 asigna al patrón la cuota obrera cuando la cuota diaria es el salario mínimo.
CEAV incluye una primera franja en salario mínimo. Un porcentaje correcto no valida una base incorrecta.

La [resolución CONASAMI 2026](https://sidof.segob.gob.mx/notas/docFuente/5775534)
fija $315.04 generales y $440.87 en zona fronteriza norte, además de mínimos profesionales.
La zona requiere municipio, no sólo estado.
La [UMA 2026 de INEGI](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf)
rige desde febrero: diaria $117.31 y mensual $3,566.22. Ambos indicadores tienen distinta finalidad y vigencia.

### Vivienda y otros descuentos

Los créditos requieren aviso individual, modalidad y vigencia conforme a la
[Ley INFONAVIT](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIFNVT.pdf).
El Instituto documenta la [implantación del artículo 29](https://portalmx.infonavit.org.mx/wps/wcm/connect/d5213ac2-524f-4e2a-8701-aff8b023681c/Ampliacion%2BPlazoLegal%2BArt29.pdf?MOD=AJPERES)
desde el sexto bimestre de 2025, incluyendo ausencias/incapacidades y excepciones.
Falta validar criterios operativos aplicables contra aviso y SUA; no asumir que se retiene siempre
en proporción a días efectivamente trabajados.
[FONACOT](https://fonacot.gob.mx/creditofonacot/cliente/Paginas/ComoPuedoObtenerCreditoFONACOT.aspx)
distingue capacidad de descuento y restricciones para salario mínimo. Se necesitan autorización,
fundamento y saldo, además de validaciones de neto.

### Jornada y prestaciones

Se consultó la [LFT consolidada](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf),
con reforma identificada del 14 de mayo de 2026. Arts. 69–75, 76–81, 87, 97/110, 117–127
y 48/50/162: descansos, vacaciones/prima, aguinaldo, descuentos, PTU y separación.
No unificar salario integrado laboral con SBC ni aplicar automáticamente 20 días por año
a cualquier baja; la causa y los hechos determinan el tratamiento.

El [decreto de jornada de mayo de 2026](https://dof.gob.mx/nota_detalle_popup.php?codigo=5786537)
establece transición semanal 48/46/44/42/40 entre 2026 y 2030 y extras 9/9/10/11/12,
con pago doble/triple y límites diarios. No permite reducir salarios por la reducción de jornada.
El motor necesita vigencias, distribución diaria y tipo de jornada, no un único multiplicador.

### CFDI

SAT anuncia [Nómina 1.2 revisión E desde enero de 2026](https://www.sat.gob.mx/minisitio/Factura/emite_organismospublicos.htm),
con nuevos catálogos y validaciones. El máximo técnico aceptado por el esquema para subsidio
no es el subsidio que corresponde legalmente a cada empleado.
Se requiere contrato PAC, XSD/catálogos vigentes, XML sellado, UUID, estados, reintentos seguros,
cancelación/sustitución, conservación de evidencia y conciliación. Esto no está implementado por imprimir el recibo.

## Inventario completo a cerrar

| Bloque | Cobertura necesaria y aceptación |
| --- | --- |
| Expediente | RFC/CURP/NSS, datos CFDI, contrato, antigüedad, alta/baja/reingreso, salario/prestaciones, SBC, registro patronal, centro/municipio/estado y múltiples empleadores; propiedad y vigencias verificadas. |
| Sueldos | Fijo, diario, por hora, destajo, comisiones, bonos y propinas cuando proceda; periodicidad y cambios intraperiodo; significado inequívoco del monto capturado. |
| Asistencia | Rotaciones, turnos nocturnos, descanso, festivos, vacaciones, permisos, faltas, retardos y extras; separar evidencia de tiempo y derecho al pago. |
| Prestaciones | Aguinaldo, vacaciones/prima, dominical, descanso/festivo, vales, alimentos/habitación, previsión y ahorro; importe gravado/exento e integración independiente. |
| ISR | Subsidio, límites por concepto, varios pagos al mes, procedimientos extraordinarios, retroactivos, cierres mensual/anual y sus excepciones. |
| IMSS/retiro/vivienda | SBC fijo/variable/mixto, movimientos, días por ramo, incapacidad con tipo/folio, prima de riesgo, mínimos/topes y CEAV anual; conciliación SUA. |
| Deducciones | INFONAVIT, FONACOT, pensión alimenticia, préstamos/anticipos, ahorro y cuotas; prioridades, límites, saldos y tratamiento de insuficiencia salarial. |
| PTU | Bolsa autorizada, elegibilidad, días/salarios, reparto y topes, provisión frente a pago, exenciones/acumulados. |
| Separación | Finiquito, prestaciones devengadas, indemnización por causa, prima de antigüedad, salarios vencidos cuando proceda e ISR específico. Revisión humana de hechos jurídicos. |
| Estados | Territorialidad, bases/exenciones, tasa/tarifa, adicionales, estímulos condicionados, retenciones y calendario de cada una de las 32 entidades. |
| Cumplimiento | CFDI ordinario/extraordinario, PAC, reportes SAT/SUA/IDSE/SIPARE y declaraciones locales mediante contratos explícitos. Calcular no equivale a presentar. |
| Operación | Preparar, revisar, aprobar, estado fiscal/timbrado, pagar y conciliar; transiciones acordes al contrato vigente, idempotencia y ajustes sin reescribir historia. |
| Especiales | Asimilados/consejeros, pensiones, sector público/ISSSTE, hogar, campo, plataformas, extranjeros y contratos colectivos superiores. Reglas y pruebas propias, hoy no validadas por seleccionar MX. |

## Cobertura estatal

**Reglas específicas aplicadas por el proveedor: 0/32.** Hoy consulta el ámbito nacional vacío.
Que el 3% coincida con alguna tasa no valida su base, estímulos, obligaciones ni vigencias.

Contrastes verificados: [Nuevo León, art. 157](https://www.hcnl.gob.mx/trabajo_legislativo/leyes/leyes/ley_de_hacienda_del_estado_de_nuevo_leon/)
3%; [Quintana Roo, arts. 5–6](https://documentos.congresoqroo.gob.mx/leyes/L167-XVIII-20251216-L1820251216190-Ley-del-Impuesto-sobre-N%C3%B3minas.pdf)
base mensual y 4%; [Finanzas CDMX](https://www.finanzas.cdmx.gob.mx/comunicacion/noticias/la-secretaria-de-administracion-y-finanzas-de-la-ciudad-de-mexico-encabeza-reunion-con-las-16-alcaldias)
confirma 4%. Una iniciativa de aumento no sustituye la ley promulgada.

| Estado | Verificación normativa completa | Implementación específica |
| --- | --- | --- |
| Aguascalientes | Pendiente | No |
| Baja California | Pendiente | No |
| Baja California Sur | Pendiente | No |
| Campeche | Pendiente | No |
| Chiapas | Pendiente | No |
| Chihuahua | Pendiente | No |
| Ciudad de México | Parcial: tasa contrastada | No |
| Coahuila | Pendiente | No |
| Colima | Pendiente | No |
| Durango | Pendiente | No |
| Guanajuato | Pendiente | No |
| Guerrero | Pendiente | No |
| Hidalgo | Pendiente | No |
| Jalisco | Pendiente | No |
| Estado de México | Pendiente | No |
| Michoacán | Pendiente | No |
| Morelos | Pendiente | No |
| Nayarit | Pendiente | No |
| Nuevo León | Parcial: tasa contrastada | No |
| Oaxaca | Pendiente | No |
| Puebla | Pendiente | No |
| Querétaro | Pendiente | No |
| Quintana Roo | Parcial: tasa y base mensual contrastadas | No |
| San Luis Potosí | Pendiente | No |
| Sinaloa | Pendiente | No |
| Sonora | Pendiente | No |
| Tabasco | Pendiente | No |
| Tamaulipas | Pendiente | No |
| Tlaxcala | Pendiente | No |
| Veracruz | Pendiente | No |
| Yucatán | Pendiente | No |
| Zacatecas | Pendiente | No |

## Diseño y secuencia propuestos

1. **Contrato México y neto ordinario.** DTOs y perfiles tipados por empresa/registro/empleado,
   vigencias y fuentes; salario mínimo, subsidio/cierre, SBC/días y extras/descanso. Reutilizar
   el propietario Nómina, JdbcTemplate, reglas, permisos y snapshots existentes.
2. **Bases independientes.** Cada percepción produce bruto, ISR gravado/exento, integración SBC,
   base estatal y clasificación CFDI. Separar fecha de pago, devengo, días laborales, descansos
   remunerados y cotización; segmentar cambios. Conservar la política automática de faltantes
   y el contrato de Control, sin convertir descansos/permisos en faltas.
3. **Acumulados y prestaciones.** Libro mexicano por mes/año de pagos y ajustes efectivos,
   con transacciones, bloqueo e idempotencia. Prestaciones, PTU, créditos, incapacidades y
   cierres. No imponer esa semántica al acumulador de otros países.
4. **Cobertura nacional y separación.** Paquetes normativos de 32 entidades y tratamientos
   de finiquito/liquidación/regímenes especiales; cada paquete con fuente, vigencia, unidades,
   redondeo, casos de frontera y resultados independientes.
5. **Validación y frontend.** Estado de preparación fiscal separado de “proveedor soportado”.
   Proponer impedir aprobación fiscal si faltan datos/reglas necesarios, con explicación y
   enlace al campo que debe corregirse. Esta auditoría no activa un nuevo bloqueo.
   Flujo: preparar datos → revisar incidencias/diferencias → aprobar.
   Inspector: “Recibe”, “Se descuenta”, “Paga la empresa”, “Cómo se calculó”.
6. **Timbrado, pago y conciliación.** Contrato PAC, pruebas de cancelación/sustitución y fallos,
   libros conciliados, reportes y operación de pago. UI/MCP usan los mismos validadores y
   autorización; el asistente no inventa SBC, avisos, registros ni hechos de separación.

La prioridad no recorta el alcance: evita combinar cambios legales, esquema, timbrado y rediseño
visual en una sola entrega imposible de revisar. Las migraciones serán nuevas; no modificar V84
ni V361 aplicadas. Conservar snapshots aprobados/pagados y corregir mediante ajustes trazables.

## Criterios de aceptación antes de declarar versión final

- Casos independientes por salario mínimo general/fronterizo/profesional, salarios altos/bajos,
  límites ISR/UMA/CEAV y beneficios con exención agotada.
- Meses 28/29/30/31 días, enero/febrero, diciembre/enero, cuatro/cinco pagos semanales,
  catorcena/quincena, pagos ordinarios y extraordinarios dentro del mismo mes.
- Jornadas diurna/nocturna/mixta; extras dobles/triples; descanso/festivo; permisos, faltas con/sin
  horario, incapacidades por tipo, alta/baja/reingreso, salario variable/mixto y retroactivos.
- Aguinaldo, vacaciones/prima, PTU, créditos concurrentes, pensión alimenticia y separación por
  causas distintas; elegibilidad, límites y saldos con evidencia.
- Cada estado y régimen declarado soportado tiene contrato normativo y pruebas propias.
- Igualdad UI/MCP/backend, aislamiento entre empresas, idempotencia/reintentos concurrentes,
  cálculos trazables e inmutabilidad de historia.
- Conciliación de importes con referencias oficiales aplicables, CFDI/PAC y pagos; toda
  diferencia explicada. Tener pruebas verdes que repitan la fórmula actual no basta.

## Verificación realizada y preservación

- Copia aislada del proyecto; proveedor MX, motor, contexto y V361 comparados con el árbol actual.
- MySQL desechable propio, puerto 13327, base indice_test_db; nunca la base funcional o producción.
- Arranque Flyway desde baseline, 301 migraciones aplicadas hasta V361.
- **40 pruebas, 0 fallos, 0 errores, 0 omitidas:** 25 de integridad con reglas reales,
  8 de tratamiento fiscal/operativo/excluido y 7 diagnósticas que reproducen los hallazgos.
- Maven compiló la copia como parte de test. No se recompiló ni reinició el backend funcional.
- Log local: /tmp/indice-mx-payroll-audit-tests.log. La prueba diagnóstica temporal
  MexicoPayrollAuditProbeTest quedó en la copia indicada por
  /tmp/indice-payroll-treatment-build-path; no se incorpora como expectativa de comportamiento
  correcto al código de producción. Contenedor de pruebas eliminado tras terminar.
- Cambios de producto/frontend: N/A. Build frontend: N/A. Migraciones nuevas: N/A.
  Despliegue, push, commit y recálculo/aprobación/pago de nóminas reales: N/A.
- Se preservan autorización, contratos API, clasificación fiscal, política de faltantes, snapshots,
  historia financiera y trabajo local ajeno.

Las correcciones previas documentadas en [cálculos](payroll-calculation-review-2026-10-25.md)
y [tratamientos](payroll-treatment-review-2026-10-25.md) siguen vigentes. Este documento identifica
el trabajo adicional; no transforma sus pruebas aritméticas en certificación integral de México.
