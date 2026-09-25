# CI-only dependency. The upstream binary registries no longer reliably serve
# this release; build the same official source instead of using a third-party image.
FROM golang:1.24-alpine AS build
RUN apk add --no-cache git ca-certificates
WORKDIR /source
RUN git init . \
    && git fetch --depth=1 https://github.com/minio/minio.git 07c3a429bfed433e49018cb0f78a52145d4bedeb \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = 07c3a429bfed433e49018cb0f78a52145d4bedeb
RUN CGO_ENABLED=0 go build -trimpath -o /out/minio .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates \
    && mkdir /data && chown 10001:10001 /data
COPY --from=build /out/minio /usr/bin/minio
COPY --from=build /source/LICENSE /licenses/minio/LICENSE
USER 10001:10001
WORKDIR /data
EXPOSE 9000
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data"]
