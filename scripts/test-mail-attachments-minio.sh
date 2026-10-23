#!/usr/bin/env bash
set -euo pipefail
umask 077
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${TEST_DATASOURCE_URL:?An isolated indice_test_db datasource is required}"
: "${TEST_DATASOURCE_USERNAME:?Test database username is required}"
: "${TEST_DATASOURCE_PASSWORD:?Test database password is required}"
python3 - <<'PY'
import os,urllib.parse
url=urllib.parse.urlparse(os.environ['TEST_DATASOURCE_URL'].removeprefix('jdbc:'))
assert url.scheme=='mysql' and url.hostname=='127.0.0.1' and url.path=='/indice_test_db'
assert url.port in (3306,13321), 'Use the CI service or the verified disposable local test database'
PY
container=indice-mail-attachments-minio-test
image="${MAIL_ATTACHMENT_TEST_MINIO_IMAGE:-indice-minio-ci:07c3a429bfed}"
port=19300
container_id=''
cleanup() {
  if [[ -n "$container_id" ]]; then docker rm -f "$container_id" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
if docker inspect "$container" >/dev/null 2>&1; then
  echo 'The test container name is already in use; existing containers are preserved.' >&2
  exit 1
fi
docker image inspect "$image" >/dev/null
export TEST_MINIO_ACCESS_KEY=indice-attachment-test
export TEST_MINIO_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
export MINIO_ROOT_USER="$TEST_MINIO_ACCESS_KEY" MINIO_ROOT_PASSWORD="$TEST_MINIO_SECRET_KEY"
export TEST_MINIO_ENDPOINT="http://127.0.0.1:$port"
container_id="$(docker run -d --name "$container" --label indice.purpose=isolated-mail-attachment-test \
  --tmpfs /data:rw,nosuid,size=134217728 --memory=512m -p "127.0.0.1:$port:9000" \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD "$image" server /data --address :9000)"
ready=false
for attempt in $(seq 1 30); do
  if curl -fsS "$TEST_MINIO_ENDPOINT/minio/health/live" >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
[[ "$ready" == true ]] || { echo 'Disposable MinIO did not become ready.' >&2; exit 1; }
echo 'Testing small and 10 MiB template/private uploads with real disposable MinIO; SMTP is mocked.'
cd "$root"
./mvnw -B -ntp '-Dtest=MailboxIntegrationTest#realMinioPersistsReusableTemplateAndPrivateAttachments' test
