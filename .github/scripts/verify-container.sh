#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <image>" >&2
  exit 2
fi

image="$1"
container_id=""

fail() {
  echo "Container verification failed: $*" >&2
  return 1
}

cleanup() {
  status=$?
  if [[ -n "$container_id" ]]; then
    if [[ $status -ne 0 ]]; then
      docker logs "$container_id" >&2 || true
    fi
    docker rm --force "$container_id" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup EXIT

configured_user="$(docker image inspect --format '{{.Config.User}}' "$image")"
case "$configured_user" in
  ""|root|0|0:*) fail "image user must be explicitly non-root, got '${configured_user:-<empty>}'" ;;
esac

exposes_8080="$(docker image inspect --format '{{if index .Config.ExposedPorts "8080/tcp"}}yes{{end}}' "$image")"
[[ "$exposes_8080" == yes ]] || fail "image does not expose 8080/tcp"

container_id="$(docker run --detach \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --security-opt no-new-privileges \
  --publish 127.0.0.1::8080 \
  "$image")"

health=""
for _ in {1..30}; do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_id")"
  case "$health" in
    healthy) break ;;
    unhealthy|missing) fail "container health is $health" ;;
  esac
  sleep 1
done
[[ "$health" == healthy ]] || fail "container did not become healthy within 30 seconds"

docker top "$container_id" -eo pid,user,comm | awk '
  NR > 1 { count += 1; if ($2 == "root" || $2 == "0") bad = 1 }
  END { exit(count == 0 || bad) }
' || fail "a live container process is missing or running as root"

published_address="$(docker port "$container_id" 8080/tcp | head -n 1)"
published_port="${published_address##*:}"
base_url="http://127.0.0.1:${published_port}"

[[ "$(curl --fail --silent --show-error "$base_url/health")" == "ok" ]] ||
  fail "health endpoint body must be 'ok'"

curl --fail --silent --show-error "$base_url/player" | grep -q 'id="root"' ||
  fail "SPA fallback did not serve the application shell"

missing_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$base_url/missing.js")"
[[ "$missing_status" == 404 ]] || fail "missing static asset returned $missing_status instead of 404"

headers="$(curl --silent --show-error --dump-header - --output /dev/null "$base_url/" |
  tr -d '\r' | tr '[:upper:]' '[:lower:]')"

assert_header() {
  local expected="$1"
  grep -Fqx "$expected" <<<"$headers" || fail "missing response header: $expected"
}

assert_header "x-content-type-options: nosniff"
assert_header "x-frame-options: deny"
assert_header "referrer-policy: no-referrer"
assert_header "permissions-policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), screen-wake-lock=(self)"
grep -Fq "content-security-policy: default-src 'self';" <<<"$headers" ||
  fail "missing restrictive Content-Security-Policy"
grep -Fq "cache-control: no-cache" <<<"$headers" ||
  fail "application shell must revalidate"
grep -Eq '^server: nginx/[0-9]' <<<"$headers" &&
  fail "Server header discloses the NGINX version"

index_html="$(curl --fail --silent --show-error "$base_url/")"
asset_path="$(sed -n 's|.*\(/assets/[^"[:space:]]*\).*|\1|p' <<<"$index_html" | head -n 1)"
[[ -n "$asset_path" ]] || fail "could not discover a fingerprinted asset"

asset_headers="$(curl --silent --show-error --dump-header - --output /dev/null "$base_url$asset_path" |
  tr -d '\r' | tr '[:upper:]' '[:lower:]')"
grep -Fqx "cache-control: public, max-age=31536000, immutable" <<<"$asset_headers" ||
  fail "fingerprinted asset is missing immutable caching"

echo "Container verification passed for $image"
