#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$repo_root/config/.ci-tls"
mkdir -p "$repo_root/public/12-d1q7m4z8pv"

openssl req \
  -x509 \
  -newkey rsa:2048 \
  -nodes \
  -keyout "$repo_root/config/.ci-tls/key.pem" \
  -out "$repo_root/config/.ci-tls/cert.pem" \
  -days 7 \
  -subj "/CN=localhost"

printf '4242\n' > "$repo_root/public/12-d1q7m4z8pv/password.xdxdxdxd"

cat > "$repo_root/config/.env" <<EOF
HTTP_PORT=8080
HTTPS_PORT=8443
HTTP2_PORT=9443
APP_ORIGIN=https://localhost:8443
TLS_KEY_PATH=$repo_root/config/.ci-tls/key.pem
TLS_CERT_PATH=$repo_root/config/.ci-tls/cert.pem
EOF
