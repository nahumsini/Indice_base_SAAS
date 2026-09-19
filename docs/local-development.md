# Desarrollo local

Estado: guía operativa del entorno local; no configura APPTEST ni producción.
Fuentes: [Makefile](../Makefile), [CI](../.github/workflows/ci.yml),
[reglas del repositorio](../AGENTS.md) y [despliegue](../deployment/README.md).
Los comandos siguientes se ejecutan desde la raíz del repositorio.

## Requisitos

- Java 21; el repositorio incluye Maven Wrapper (`mvnw`).
- Node.js 22 y npm, alineados con el entorno de CI.
- Docker con Compose disponible y su motor iniciado.
- Puertos libres para los servicios locales o una configuración alternativa explícita.

## Inicio habitual

```bash
make dev
```

El target prepara MySQL, MinIO y face-service, instala las dependencias frontend, inicia Spring
con `local,minio` y espera al backend antes de iniciar Vite. No ejecuta `db-reset`.

| Servicio | Valor local predeterminado |
|---|---|
| Frontend | `http://127.0.0.1:5174` |
| Backend | `http://127.0.0.1:8082` |
| MySQL | `127.0.0.1:3307`, contenedor `indice-mysql-fresh` |
| Base funcional | `indice_db` |
| MinIO API / consola | `127.0.0.1:9000` / `127.0.0.1:9001` |

El arranque puede aplicar migraciones Flyway pendientes. Con la configuración local predeterminada
también restaura el acceso sintético `demo@example.com` / `demo123` en Empresa Demo Spring. La carga
de datasets demo es una operación separada. Para desactivar la restauración automática del login:

```bash
LOCAL_DEMO_SEED_ON_DEV=false make dev
```

Las excepciones locales de MFA, correo y secretos de kiosco sólo corresponden a los targets Make
de estación de trabajo. El contrato y las restricciones de esa excepción están en
[Local development login](../deployment/README.md#local-development-login).
Los targets no leen automáticamente `.env.local`.

## Comandos y efectos

| Comando | Efecto |
|---|---|
| `make help` | Mostrar los targets disponibles. |
| `make infra` | Preparar MySQL, MinIO, minio-init y face-service; puede recrear los contenedores de MinIO. |
| `make frontend-install` | Instalar dependencias frontend. |
| `make backend` | Ejecutar sólo Spring; requiere infraestructura disponible. |
| `make frontend` | Ejecutar sólo Vite; requiere dependencias instaladas. |
| `make ps` | Consultar el estado de infraestructura. |
| `make logs` | Seguir logs locales. |
| `make down` | Detener servicios Compose y el contenedor MySQL local. |
| `make restore-local-demo-login` | Restaurar explícitamente las credenciales demo locales. |
| `make seed-local-demo` | Actualizar datos sintéticos y restaurar el login demo. |
| `make seed-local-pos-kiosk-catalog` | Agregar el dataset demo del catálogo POS. |

`make up` es alias de `make dev`. Al detener la sesión de `make dev` se detienen sus procesos
frontend/backend; para reiniciarlos por separado usa sus targets en terminales distintas.

El frontend recibe `VITE_BACKEND_URL=http://127.0.0.1:8082` y `VITE_API_BASE_URL` vacío desde Make.
Si eliges puertos alternativos, conserva la relación entre Vite, backend y storage.

## Base de pruebas aislada

[La configuración de pruebas](../src/test/resources/application.properties) usa `indice_test_db`
y variables `TEST_DATASOURCE_*`. Las pruebas de integración pueden crear y modificar datos.
Nunca les asignes `indice_db` ni una conexión productiva.

Si necesitas una instancia independiente, este ejemplo usa el puerto **13307** para no ocupar el
3307 de la base funcional:

```bash
docker run --rm -d --name indice-mysql-tests \
  -p 127.0.0.1:13307:3306 \
  -e MYSQL_DATABASE=indice_test_db \
  -e MYSQL_USER=indice_test_user \
  -e MYSQL_PASSWORD=indice_test_pass \
  -e MYSQL_ROOT_PASSWORD=indice_test_root \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_0900_ai_ci
```

Espera a que MySQL acepte conexiones. Después, en la terminal de pruebas:

```bash
export TEST_DATASOURCE_URL='jdbc:mysql://127.0.0.1:13307/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&useUnicode=true&characterEncoding=utf8'
export TEST_DATASOURCE_USERNAME=indice_test_user
export TEST_DATASOURCE_PASSWORD=indice_test_pass
./mvnw -B -ntp clean test
```

Al terminar, `docker stop indice-mysql-tests` elimina esa instancia desechable porque se creó con
`--rm`. No uses el nombre de un contenedor funcional para esta operación.

## Validación según el cambio

Primero ejecuta la regresión del flujo afectado. Los scripts disponibles están en
[react/package.json](../react/package.json); los tests Java están en [src/test](../src/test/).

- Frontend: regresión relevante, `npm run typecheck --prefix react` y
  `npm run build --prefix react`.
- Backend: prueba focalizada y `./mvnw -DskipTests compile`; amplía la suite según el riesgo.
- Migraciones: prueba `MigrationVersionUniquenessTest` y arranque Flyway en una base aislada.
- Documentación: enlaces, referencias, coherencia con sus fuentes y `git diff --check`.
- Liberación: [preflight y despliegue](../deployment/README.md) y
  [gate de seguridad](indice-public-release-security-gate.md).

No ejecutes todas las suites por un cambio de redacción. No presentes una compilación como prueba
del flujo funcional ni un test histórico como evidencia de la versión actual.

## Reinicio y reparación: operaciones separadas

`make db-reset` **elimina y recrea `indice_db`** en el contenedor local configurado. Es una operación
destructiva y no es un paso de arranque ni una solución habitual a errores de pruebas.

`make db-repair` modifica metadata de Flyway. Sólo corresponde a una reparación analizada; no debe
usarse para ocultar checksums inconsistentes o migraciones aplicadas que fueron editadas.

Las baselines adoptadas y las migraciones aplicadas son inmutables. Consulta la
[guía de migraciones](../src/main/resources/db/migration/README.md) y el directorio real para
identificar versiones, sin copiar números de notas antiguas.
