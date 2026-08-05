# Nómina — contratos de impresión e inventario documental

Fecha: 4 de agosto de 2026
Estándar aplicado: `INDICE_DOCUMENT_PRINT_STANDARD_DRAFT.md`, versión 0.1
Estado: implementación técnica terminada; revisión legal y QA físico pendientes

## Decisión documental

La corrida completa y el desglose individual no son el mismo documento y no deben
compartir una clasificación legal genérica.

| Documento | Propósito | Categoría | Modificadores | Contrato de página |
|---|---|---|---|---|
| Detalle de corrida de nómina | Revisión y control interno de todas las líneas de una corrida | Operational Report | confidential, internal, fiscal, multi-currency | A4 horizontal, margen seguro de 10 mm, tabla financiera, pie y páginas propias, versión 1.0 |
| Desglose personal de nómina | Explicar al colaborador cómo se construyó su pago | Legal Document | confidential, employee-facing, fiscal | A4 horizontal, margen seguro de 10 mm, contexto del receptor, libro de conceptos, pie y páginas propias, versión 1.0 |

El desglose personal es un documento de consulta. No se denomina recibo fiscal ni
afirma timbrado, certificación, firma o presentación ante una autoridad.

Los dos documentos incluyen una nota de colaboración profesional: los cálculos se
elaboran con los datos registrados, las reglas configuradas y las referencias
públicas disponibles. La salida facilita, pero no sustituye, la revisión del
profesional contable o fiscal responsable en la jurisdicción aplicable. Esta
redacción reconoce el criterio del especialista y evita presentar al sistema como
reemplazo de la validación profesional.

## Datos que carga cada documento

### Corrida completa

- empresa y logotipo desde Config Center, con respaldo textual;
- folio interno estable de la corrida y estado;
- periodo, frecuencia y agrupación organizacional;
- jurisdicción y divisa nativa de la cohorte;
- modo y fecha de cálculo;
- totales de percepciones, deducciones, obligaciones patronales y neto;
- libro completo de colaboradores con unidad, negocio, jornada y alertas;
- apéndice de ajustes, incentivos, notas y alertas cuando existen;
- referencias normativas realmente almacenadas en los conceptos de la corrida.

### Desglose personal

- empresa y logotipo desde Config Center, con respaldo textual;
- folio interno de corrida y línea;
- nombre, código de colaborador, puesto, unidad y negocio;
- periodo, jurisdicción, divisa, tratamiento y fecha de cálculo;
- percepciones, deducciones, obligaciones patronales y neto;
- asistencia del periodo;
- todos los conceptos sin truncamiento silencioso;
- base, tasa, origen, tratamiento fiscal y referencia de regla cuando existen;
- alertas y notas registradas.

## Comportamiento por jurisdicción

La presentación resuelve el marco visual desde `country_code` y
`jurisdiction_code`. Los importes, fórmulas y referencias siempre provienen del
backend y de los snapshots de la corrida.

| Jurisdicción | Contexto visual disponible |
|---|---|
| México | ISR, IMSS, INFONAVIT y SAR |
| Colombia | Retención, PILA, seguridad social y parafiscales |
| Estados Unidos | Retención federal/estatal, FICA y FUTA/SUTA |
| Canadá estándar | Impuesto federal/provincial, CPP y EI |
| Quebec | Impuesto federal/Quebec, QPP, QPIP y EI |
| Brasil | INSS, IRRF, FGTS y RAT/terceros |
| Otra | Identifica la jurisdicción almacenada y declara la ausencia de referencias específicas |

El marco anterior organiza la lectura; no genera importes ni sustituye las reglas
del proveedor fiscal. Las referencias visibles se deduplican desde
`legal_classification`, `rule_code` y `tax_treatment`.

## Lenguaje visual Índice

- la empresa cliente es la identidad principal;
- Índice aparece únicamente como atribución discreta en el pie;
- aqua se usa como firma, azul profundo como jerarquía documental y grafito como texto;
- pesos tipográficos limitados a 400 y 500;
- títulos en sentence case, sin mayúsculas forzadas;
- números financieros tabulares y alineados a la derecha;
- color semántico limitado a estados y alertas;
- pie propio con actualización, confidencialidad, folio, versión y página;
- nombre de archivo estable por tipo, folio, línea y periodo.

## Brechas de contrato de datos

Para convertir el desglose en un recibo oficial por jurisdicción todavía se
requieren contratos explícitos para:

- identidad legal y fiscal completa del emisor;
- identificadores fiscales y de seguridad social del colaborador;
- folio o identificador de autoridad;
- certificado, sello, firma o código de verificación;
- original, copia, reimpresión y revocación;
- fecha y evidencia de presentación ante la autoridad;
- reglas de redacción o enmascaramiento por rol y jurisdicción.

Estos valores no se inventan en frontend. Hasta que existan y sean revisados, la
salida se mantiene como reporte operativo y desglose personal de consulta.

## Evidencia técnica

- TypeScript: aprobado el 4 de agosto de 2026;
- regresión de Recursos Humanos: 6 de 6 pruebas aprobadas;
- contrato A4 horizontal, pie propio, nombres estables y carga de imágenes cubiertos por regresión;
- tipografía de Recursos Humanos sin pesos 600 o superiores y sin mayúsculas forzadas;
- build de producción y revisión visual representativa quedan como siguientes puertas de entrega.

## QA pendiente antes de aprobación legal

- corrida con 1, 20 y 100 o más colaboradores;
- desglose con cero, pocos y muchos conceptos;
- nombres largos y ausencia de logotipo;
- cada locale soportado;
- una muestra real por país y por provincia/estado aplicable;
- escala de grises y prueba física A4 horizontal;
- validación legal del contenido por jurisdicción;
- revisión del comportamiento de impresión en navegadores soportados.
