# Current Backend Docker Flow

Date: 2026-04-01

This note only captures the runtime flow we are using right now.

## What We Actually Changed

- We did not make Docker code changes in this repo.
- We did not change the Docker image itself.
- We created a new MySQL container for the backend runtime.
- The backend config was already expecting MySQL on port `3307`.

## Current Container

- name: `indice-mysql-fresh`
- image: `mysql:8.0`
- host port: `3307`
- database: `indice_db`
- user: `indice_user`
- password: `indice_pass`
- root password: `rootpass`

## Current Flow

1. Create the MySQL container the first time:

```bash
docker run -d \
  --name indice-mysql-fresh \
  --restart always \
  -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=indice_db \
  -e MYSQL_USER=indice_user \
  -e MYSQL_PASSWORD=indice_pass \
  mysql:8.0
```

2. If the container already exists, start it:

```bash
docker start indice-mysql-fresh
```

3. Run the Spring backend from the project root:

```bash
cd /home/akira/Documents/Indice/indice_saas_react_java_springboot
./mvnw spring-boot:run
```

4. Check backend health:

```bash
curl http://127.0.0.1:8082/api/v1/health
```

## Important Detail

- If `indice-mysql-fresh` is not running, Spring Boot fails because nothing is listening on `127.0.0.1:3307`.
- `-d` only runs the container in detached mode.
- `--restart always` is the setting that makes Docker start the container again after reboot.

## IntelliJ Or DataGrip Connection

- Host: `127.0.0.1`
- Port: `3307`
- Database: `indice_db`
- User: `indice_user`
- Password: `indice_pass`
