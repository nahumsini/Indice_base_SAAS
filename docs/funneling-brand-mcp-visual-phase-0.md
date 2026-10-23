# Funneling: identidad de marca y MCP visual — Fase 0

Fecha: 2026-10-23. Estado general: **PROTOTIPO aislado**. Integración nativa con
ChatGPT/Lupita: **PENDIENTE**. Fases 1–6: **no iniciadas**; requieren la validación
solicitada por el usuario al terminar esta fase.

## 1. Alcance y estado inicial

Rama comprobada antes de editar: `codex/continuacion-20261022`.
HEAD: `da7e8bf36edc978799768a53b9dddfcccf4ea36a`.
El árbol ya tenía cambios locales anteriores. Se registraron hashes de 196 archivos
preexistentes modificados/no versionados individualmente para comprobar su conservación.

Se revalidaron las bases relevantes en la implementación:

- `react/src/app/BasicModules/Sales/Ventas.tsx`: carga Funneling y lo incluye en Herramientas.
- `Sales/Funneling/Funneling.tsx`: conserva las cinco vistas.
- `Sales/Funneling/funnelApi.ts` y `campaignPrompt.ts`: persistencia y prompts actuales.
- `configcenter/company/ConfigCenterCompanyUseCases.java#getCompanyLogo`: propietario del logo.
- `storage/ObjectStorageService.java` y `billing/storage/CompanyStorageMeter.java`: almacenamiento y cuota.
- `sales/SalesOperationalFileService.java`: archivos de productos y alcance de su propietario.
- `sales/funneling/IdeasBoardRepository.java#asset`: fotos de pizarra por empresa/usuario.
- `integrations/indice-mcp/src/fileTools.ts#registerFileTools`: recurso privado incrustado existente.
- `integrations/indice-mcp/src/httpApp.ts`: autorización delegada y catálogo por petición.

El experimento no cambia esos propietarios, controladores, tablas, permisos ni prompts.
No utiliza MySQL, MinIO, cuentas reales, claves de API ni archivos empresariales.

## 2. Archivos de esta fase

Rutas relativas al repositorio:

| Archivo | Función |
|---|---|
| `integrations/indice-mcp/package.json` | Añade `test:visual-probe` y `probe:visual`; no cambia `start`. |
| `integrations/indice-mcp/src/test/visualProbe/samples.ts` | Lista fija PNG/JPEG con firma, límite de 2 MiB y hashes fijados. |
| `integrations/indice-mcp/src/test/visualProbe/tools.ts` | Tres herramientas exclusivamente sintéticas, de solo lectura. |
| `integrations/indice-mcp/src/test/visualProbe/server.ts` | Entrada HTTP limitada a loopback; cuerpos de hasta 4 KiB. |
| `integrations/indice-mcp/src/test/visualProbe/stdio.ts` | Entrada stdio para Inspector o un túnel privado de prueba. |
| `integrations/indice-mcp/src/test/visualProbe/runner.ts` | Cliente SDK HTTP, exportación de muestras y reporte de transporte. |
| `integrations/indice-mcp/src/test/visualProbe.test.ts` | Regresión del experimento y comparación con `get_operational_file`. |
| `integrations/indice-mcp/fixtures/visual-probe/sample.png` | Muestra sintética 640 × 480, sin metadatos empresariales. |
| `integrations/indice-mcp/fixtures/visual-probe/sample.jpg` | Codificación JPEG de la misma composición, 640 × 480. |
| `docs/validation/assets/funneling-visual-phase0-generated-ad.png` | Resultado sintético de generación con referencia; no lo sirve el MCP. |
| `docs/funneling-brand-mcp-visual-phase-0.md` | Resultados, aceptación manual, limitaciones y rollback. |

No se agregan dependencias. Las imágenes de entrada son fixtures geométricos de prueba,
no imágenes de una marca. No deben sustituirse por archivos de clientes.

## 3. Contratos del experimento

Las tres herramientas siguientes existen únicamente en el servidor de prueba:

| Herramienta | Entrada | Salida |
|---|---|---|
| `list_visual_probe_samples` | Objeto vacío estricto. | Metadatos de dos muestras; ningún bloque binario. |
| `get_visual_probe_image` | `sampleId`, `clientSupportsImages` opcional. | `ImageContent` cuando el cliente declara soporte; de otro modo, texto y metadatos. |
| `get_visual_probe_resource` | `sampleId`. | Recurso incrustado con URI `indice://visual-probe/...`, MIME y blob base64. |

Los identificadores permitidos son `synthetic-png` y `synthetic-jpeg`.
No se aceptan rutas, URL, empresa, usuario, rol, claves de objetos ni cargas de archivos.
Se entrega **una imagen por llamada**, por debajo de la propuesta de hasta tres vistas previas.
No se ha validado todavía un lote de tres imágenes ni rendimiento al límite de 2 MiB.

`clientSupportsImages` es una declaración de prueba, **no autodetección del cliente**.
Si falta o es false, la respuesta usa `CLIENT_IMAGE_UNSUPPORTED`, sin imagen, y explica
las alternativas. `TRANSPORT_READY` solo indica representación entregada; nunca significa
que un modelo haya interpretado la imagen o generado contenido.

El recurso de prueba replica el formato del lector existente. Una prueba compara sus bytes
con una llamada real a `registerFileTools/get_operational_file`, usando exclusivamente un
lector sintético. No certifica autorización ni lectura de productos empresariales.

El servidor HTTP es anónimo **porque únicamente sirve dos fixtures sintéticos fijos**.
Escucha solo en `127.0.0.1`, valida Host, no permite caché ni CORS abierto, limita el cuerpo
y no tiene rutas ERP. Esto no es una excepción para exponer datos empresariales sin OAuth.
La entrada de producción `src/server.ts`, su catálogo y la configuración de despliegue permanecen iguales.

Migraciones: **N/A**. Contratos o scopes de producción nuevos: **N/A**.

## 4. Resultados separados

| Capa | Resultado | Clasificación y límite |
|---|---|---|
| Transporte HTTP SDK | PNG y JPEG recibidos como `image` y `resource`, con bytes y SHA-256 idénticos al original. | **OPERATIVO local**. No demuestra visión del modelo. |
| Transporte stdio | Cliente SDK ejecuta la entrada privada y recupera la muestra, con bytes idénticos. | **OPERATIVO local**; no se ejecutó un túnel real. |
| Interpretación visual | El agente pudo inspeccionar las respuestas recuperadas por MCP, renderizadas mediante un adaptador explícito. | **PARCIAL**: no fue recepción nativa de la herramienta en ChatGPT/Lupita ni una prueba ciega. |
| Generación con referencia | La herramienta integrada `image_gen` recibió el PNG exportado del resultado MCP y produjo una pieza reconocible. | **PARCIAL**: recorrido MCP → archivo → herramienta externa, coordinado por el agente. |
| ChatGPT/Lupita nativo | No se conectó este servidor a una conversación real de ChatGPT. | **PENDIENTE**. `tunnel-client` no está instalado en el entorno inspeccionado. |
| Cliente sin soporte | Respuesta de solo metadatos para soporte false/omitido. | **OPERATIVO como simulación contractual**, no ensayo de todos los clientes. |

La inspección visual identificó el envase rectangular azul oscuro, tapa amarilla, etiqueta
blanca con círculo coral, círculo coral arriba a la izquierda, triángulo morado arriba a la
derecha, cuadrado verde abajo a la izquierda y tres puntos azules abajo a la derecha.
Los metadatos de las herramientas no proporcionan esa descripción. Sin embargo, el agente
también participó en crear el fixture: esto no es una evaluación independiente de reconocimiento.

La pieza generada mantiene esos elementos reconocibles, pero añade volumen, sombras y un
pedestal y cambia proporciones/composición. **No conserva exactamente el diseño ni los píxeles**.
El original permanece intacto. No se debe prometer preservación exacta de un logo mediante regeneración.

Comparación observada en una ejecución local, sin inferir capacidad de carga:

| Muestra | Bytes del archivo | Respuesta `image` | Respuesta `resource` |
|---|---:|---:|---:|
| PNG | 3 116 | 4 488 bytes | 4 560 bytes |
| JPEG | 18 634 | 25 184 bytes | 25 257 bytes |

La diferencia de envoltura es pequeña; el tamaño está dominado por el archivo y base64.
Ambas representaciones conservaron el mismo contenido binario. Un recurso incrustado no
se convierte por ello automáticamente en entrada visual para cualquier cliente.

Hashes de entrada:

```text
PNG  0b7d889b119d7f6fc92ed3dfac3d2d99bf5984bba4e15c6b6612093868d838a6
JPEG ba06e501f1f4fa85b6f9dc8ff8ab7624d65486f4c3d4750066e69fae9a9755c3
```

Resultado generado: 1 579 479 bytes, 1254 × 1254; SHA-256
`80f2d8db93eaba41bd9cb48fafe44fb793f385b9aed435d2d883cc7b8f86cc1d`.

Se usó la herramienta integrada con la guía [imagegen](/Users/nahumpena/.codex/skills/.system/imagegen/SKILL.md).
No hubo llamada directa a una API con claves. El modelo interno no fue informado por la herramienta.
Prompt exacto de esta prueba:

> Use case: ads-marketing. Synthetic compatibility experiment, no real business. Create a square flat-design product advertisement using the attached image as the actual visual reference. Preserve the recognizable central product silhouette, its cap, label, emblem and packaging colors from that reference. Carry the reference palette into a restrained background with the same four kinds of surrounding geometric motifs. Keep the product prominent. Do not add any lettering, brand name, watermark or new logo. This is a test of whether a recovered reference can be used for generation; it is not a claim of pixel-perfect reproduction.

## 5. Pruebas y reproducción local

Desde `integrations/indice-mcp`:

```bash
npm run test:visual-probe
npm run probe:visual -- --out-dir /tmp/indice-funneling-visual-phase0-review
npm test
```

El runner arranca un servidor en un puerto libre de loopback y lo cierra al terminar.
Exporta las cuatro respuestas sintéticas, archivos recuperados y `transport-report.json`.
El reporte automático deja interpretación y generación como PENDING: solo la inspección posterior
puede añadir evidencia sobre esas capas, y nunca convierte el ensayo en aceptación nativa.

Evidencia de esta sesión: `/tmp/indice-funneling-visual-phase0-20261023/`:

- `transport-report.json`: transporte, tamaños, hashes y alternativa simulada.
- `synthetic-*-image.json` y `synthetic-*-resource.json`: respuestas sintéticas del SDK.
- `visual-review.json`: observaciones de la inspección y generación asistidas.
- `mcp-suite.log`: primera suite, 169/169, antes de añadir la entrada stdio.
- `mcp-suite-final.log`: suite final, **170/170 aprobadas**, cero fallos y cero omitidas.

Resultado final: compilación TypeScript MCP aprobada y suite completa de **170 pruebas**,
incluidas las **9** del experimento. `git diff --check` del archivo versionado modificado
y comprobación de espacios de los nuevos fuentes: aprobados. Los **196 archivos preexistentes**
registrados conservan su hash inicial. No se hizo commit, push, publicación ni despliegue.

Se prueban descubrimiento, PNG/JPEG, igualdad binaria, alternativa sin visión, entradas cerradas,
límite de cuerpo, Host, no-store, ausencia de rutas ERP, equivalencia con el recurso existente,
exclusión del catálogo de producción y transporte stdio.

La primera ejecución detectó que `fetch` normalizaba Host en la prueba de encabezado manipulado.
Se corrigió el cliente de prueba para enviar ese encabezado con `node:http`; el servidor no se
abrió a otros hosts. La ejecución focalizada posterior pasó 8/8 antes de añadir el caso stdio.

Java, Flyway, TypeScript de React, accesibilidad y responsividad: **N/A para esta fase**;
no hay cambios en esos componentes ni nueva UI. Persistencia, cuotas y autorización empresarial
son pruebas pendientes de las fases siguientes, no resultados obtenidos por este fixture.

## 6. Validación manual exacta en ChatGPT

Esta sección es un procedimiento pendiente, no evidencia de ejecución.

1. Ejecutar `npm run build` en `integrations/indice-mcp`.
2. Comprobar primero el transporte local con el runner anterior. Para Inspector HTTP, ejecutar:

   ```bash
   node dist/test/visualProbe/server.js --port 3019
   ```

   Seleccionar Streamable HTTP en MCP Inspector y conectar a `http://127.0.0.1:3019/mcp`.
   Esta dirección local no es una URL directamente alcanzable por ChatGPT remoto.

3. Para ChatGPT, preparar un **Secure MCP Tunnel privado de prueba** vinculado al workspace.
   Obtener el túnel y su cliente desde Platform conforme a la
   [guía oficial de OpenAI](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).
   Configurar las credenciales del túnel localmente; nunca pegarlas en chats, capturas o este informe.
   Usar la entrada stdio para no abrir una ruta pública. Tras instalar el cliente y definir
   `INDICE_PROBE_TUNNEL_ID` con el identificador real del túnel de prueba:

   ```bash
   tunnel-client init \
     --sample sample_mcp_stdio_local \
     --profile indice-visual-phase0 \
     --tunnel-id "$INDICE_PROBE_TUNNEL_ID" \
     --mcp-command "node /Users/nahumpena/Documents/GitHub/Indice_base_SAAS/integrations/indice-mcp/dist/test/visualProbe/stdio.js"
   tunnel-client doctor --profile indice-visual-phase0 --explain
   tunnel-client run --profile indice-visual-phase0
   ```

   El cliente usa la credencial de control configurada por el operador según la guía; el experimento
   no la recibe. Mantener `run` activo. Estos comandos de túnel no se ejecutaron en esta sesión.

4. En ChatGPT Plugins, añadir un MCP personalizado mediante **Tunnel**, elegir el túnel de prueba
   y configurar la conexión sintética sin autenticación de usuario. Verificar que descubre
   únicamente las tres herramientas `visual_probe`, no las herramientas empresariales de Lupita.
   Si las políticas del workspace no permiten agregarlo, registrar el bloqueo y dejar PENDIENTE.
   La [guía oficial de conexión](https://developers.openai.com/plugins/deploy/connect-chatgpt)
   describe el flujo y el refresco de metadatos.

5. Iniciar una conversación nueva y seleccionar esta conexión de prueba. No adjuntar los archivos
   manualmente ni incluir su descripción visual. Solicitar:

   > Lista las muestras. Recupera synthetic-png con get_visual_probe_image y clientSupportsImages true.
   > Describe lo que realmente puedas ver: objeto central, colores, figuras y posiciones. Si solo
   > recibes metadatos o no puedes interpretar la imagen, indícalo sin adivinar.

6. Repetir en otra conversación nueva con `synthetic-jpeg`. En otras dos conversaciones, repetir
   usando `get_visual_probe_resource`. Separar los ensayos para no inferir la segunda representación
   a partir de una imagen ya vista en la misma conversación. No utilizar una descripción anterior
   como prueba de que la nueva representación se interpretó.

7. Probar `get_visual_probe_image` con `clientSupportsImages false`: debe responder con metadatos
   y explicación, sin afirmar que vio una imagen ni iniciar generación.

8. En una conversación donde la imagen sí sea visible, pedir:

   > Usa exactamente la imagen que acabas de recuperar como referencia visual para preparar una
   > pieza publicitaria sintética. Conserva el producto y sus marcas reconocibles. No inventes una
   > marca ni añadas texto. Si no puedes pasar el archivo recuperado a la herramienta de generación,
   > explica esa limitación y no lo sustituyas silenciosamente por una descripción textual.

9. Registrar cliente/modelo disponible, fecha, herramienta y argumentos, representación recibida,
   descripción, resultado generado y si hubo un adjunto manual. Comparar con el fixture después de
   responder. Un adjunto manual permite probar una alternativa, pero no aprueba el recorrido automático.
   No aprobar fidelidad exacta del logo por parecido visual.

No se modifica la conexión empresarial existente ni se publican plugins. Si cambian los descriptores
del experimento, refrescar la conexión de prueba y usar una conversación nueva. Cambiar datos con
contratos estables es distinto de actualizar descriptores y debe probarse en fases posteriores.

## 7. Riesgos y puerta de decisión

- No se ha probado recepción nativa, interpretación y generación en ChatGPT/Lupita real.
- El renderizado de esta sesión usa un adaptador explícito; no prueba soporte automático de `resource`.
- La alternativa se activa por declaración; no detecta si el host ignora o transforma una imagen.
- El resultado generado demuestra semejanza y también deriva visual. El logo original debe seguir
  siendo la fuente verificable; la generación no ofrece conservación exacta.
- Las muestras son pequeñas: no certifican límites del proveedor, lotes de tres, memoria o carga.
- La ausencia de datos reales permite una prueba anónima; la entrega empresarial deberá conservar
  OAuth, scopes, módulos/pestañas, pertenencia, aprobación de uso con IA y comprobación por archivo.

Recomendación: conservar `ImageContent` como candidato para contexto visual y recurso incrustado
como comparación/descarga. Mantener metadatos primero. No declarar completa la generación visual
hasta aprobar los pasos nativos. La puerta permite considerar identidad estructurada y consulta
contextual en una fase siguiente, pero **se espera validación del usuario antes de avanzar**.

## 8. Despliegue y rollback

Despliegue APPTEST/producción: **N/A; no realizado**. No se alteran Docker, Nginx, OAuth,
variables de entorno, backend, bases funcionales ni herramientas de producción.
Este servidor de fixtures no es un servidor de marca empresarial ni debe incorporarse a la ruta pública de Índice.

Rollback del experimento: cerrar el proceso HTTP/Inspector o `tunnel-client run` con Ctrl+C;
si se creó una conexión de prueba, eliminar solo esa conexión y su túnel de prueba. Conservar
las evidencias necesarias. No tocar las conexiones existentes de Lupita ni sus grants.
Si se decide descartar el código, retirar únicamente los archivos y dos scripts de esta fase,
preservando el resto del árbol local. No hay rollback de esquema ni datos de negocio.

## 9. Pendientes

Validación nativa descrita arriba y aprobación del usuario. Perfiles persistentes, biblioteca,
selección de activos, fotografías de productos, nuevas consultas MCP empresariales y despliegues
pertenecen a las fases siguientes y no se han implementado aquí.
