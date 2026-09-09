# Cierre de fondos: resolución de saldos y autorización sin adjunto

Fecha: 2026-09-08. Base: `a4981261293fcef7282ccd097358c0ae7ecb0e79`.
Rama: `fix/petty-cash-close-resolution`.
Contrato: [Resolución del cierre](petty-cash-statement-close-resolution-contract-v1.md).

## Resultado

El modal permite traspasar saldos positivos o negativos, perdonar faltantes,
perdonar sobrantes y cargar el faltante al responsable mediante la entrada existente
de Nómina. El importe de resolución corresponde al saldo mostrado y es de solo
lectura. El servidor rechaza una confirmación con un saldo que cambió desde que se
abrió la pantalla. Devolver saldo a origen y cerrar sin saldo conservan sus usos.

La condonación de un saldo negativo ajusta hacia cero, sin una segunda salida del
importe ya gastado. El traspaso no crea un depósito. Los saldos iniciales y finales
derivados de los meses abiertos siguientes se actualizan sin modificar sus operaciones.
Los cambios se ejecutan bajo bloqueo del fondo y una única transacción. Un corte
posterior finalizado no se reescribe; un conflicto revierte incluso la deducción de
nómina recién preparada.

Un administrador puede autorizar sin adjunto. La autorización interna crea el gasto
pagado una vez; la externa permanece fuera de los gastos de empresa. Quitar el último
archivo no revoca la autorización ni resucita un registro rechazado. `SETTLED` significa
que las partidas están liquidadas, y el cierre explícito finaliza el corte. Recargar
el mes cerrado permite consultar su historial. Sus compras no admiten una reversión
que altere el corte finalizado.

Las deducciones conservan el importe y moneda originales. Una conversión para Nómina
requiere evidencia persistida y verificada para la fecha efectiva, según el contrato
de divisas existente. El cargo queda pendiente de aplicación por Nómina.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `*PettyCash*Test`, `FundExpenseCloseoutIntegrationTest`, `HrPayrollExternalDeductionServiceTest` | 96 pruebas aprobadas; 0 fallos, errores u omitidas |
| Integración nueva dentro de la suite anterior | 19 casos, con persistencia real y rollback, incluidos MXN, USD, CAD, COP y BRL |
| `npm run test:petty-cash-ui` | 19 pruebas aprobadas |
| `npm run typecheck` | Aprobado |
| `npm run build` | Aprobado |
| Compilación backend | Aprobada dentro de Maven test |
| `git diff --check` | Aprobado |
| Migraciones nuevas | N/A: no hay cambios de esquema |
| Datos funcionales o productivos usados por las pruebas | Ninguno |
| Prueba visual autenticada | Pendiente; los eventos de interfaz se prueban con transporte simulado |
| Despliegue de esta corrección | Pendiente; no se promovió esta rama a producción |

La base utilizada es la base local aislada `indice_regression_v3_test_db`, puerto 3308.
Los casos nuevos crean empresas y registros sintéticos en transacciones revertidas.
Las pruebas iniciales detectaron que el SQL de validación externa aún excluía
`DRAFT`; se corrigió junto con la regla del servicio y se comprobó de extremo a extremo.
Se corrigieron los fixtures iniciales y se repitieron las ejecuciones Maven de forma
secuencial después de una interferencia entre compilaciones. No quedan fallos en las
comprobaciones enumeradas.

## Archivos y preservación

- Backend de Caja chica: `PettyCashService`, `PettyCashRepository`,
  `PettyCashAttachmentService`, acción de cierre y DTOs de solicitud/respuesta.
- Entrada de deducciones: `HrPayrollExternalDeductionService`.
- Frontend: modal de Saldos, adaptador de Caja chica, seis traducciones y mensajes
  de errores compartidos de Finance.
- Regresión: pruebas de servicio, integración de cierres, deducciones e interfaz.
- Documentación: contrato específico y referencia desde el Backend Operating System.

Se mantienen las rutas, el aislamiento de empresa/ámbito, la autenticación/CSRF,
los importes y documentos de origen, las monedas nativas y los movimientos previos.
Los clientes anteriores siguen pudiendo enviar cierres parciales: el remanente queda
traspasado de forma explícita. No se migran ni se aprueban masivamente datos históricos.

La revisión y promoción posterior deben seguir `deployment/README.md` con evidencia
nueva del commit exacto, respaldo, comprobación en APPTEST y rollback. La aplicación
anterior entiende los estados y tipos persistidos: la nueva acción de sobrante utiliza
un tipo de ajuste y un estado ya existentes, con la decisión completa en metadatos.
