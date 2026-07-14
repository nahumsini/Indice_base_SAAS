FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
    set -eux; \
    for attempt in 1 2 3 4 5; do \
      if mvn -q -U -DskipTests dependency:go-offline; then \
        exit 0; \
      fi; \
      echo "Maven dependency download failed on attempt ${attempt}; retrying..." >&2; \
      if [ "${attempt}" -lt 5 ]; then sleep $((attempt * 10)); fi; \
    done; \
    exit 1

COPY src src
RUN --mount=type=cache,target=/root/.m2 \
    set -eux; \
    for attempt in 1 2 3; do \
      if mvn -q -U -Dmaven.test.skip=true package; then \
        exit 0; \
      fi; \
      echo "Maven package failed on attempt ${attempt}; retrying..." >&2; \
      if [ "${attempt}" -lt 3 ]; then sleep $((attempt * 10)); fi; \
    done; \
    exit 1

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

LABEL org.opencontainers.image.title="Indice ERP Backend"
LABEL org.opencontainers.image.description="Indice ERP Spring Boot API"

RUN addgroup -S spring \
    && adduser -S spring -G spring \
    && mkdir -p /app/logs \
    && chown -R spring:spring /app/logs

COPY --from=build /workspace/target/*.jar /app/app.jar

USER spring:spring

EXPOSE 8082

ENV JAVA_OPTS="-Djava.net.preferIPv4Stack=true"
ENV SPRING_FLYWAY_ENABLED=true
ENV APP_STORAGE_PROVIDER=minio
ENV APP_STORAGE_REQUIRED=true
ENV APP_STORAGE_MINIO_ENDPOINT=http://127.0.0.1:9000
ENV APP_STORAGE_MINIO_PUBLIC_ENDPOINT=http://localhost:8080/storage
ENV APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT=http://127.0.0.1:9000

ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar /app/app.jar"]
