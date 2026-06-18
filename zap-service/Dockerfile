# OWASP ZAP daemon for SecureApp — deploy this as its OWN Railway service.
# Shell-form CMD so Railway's injected ${PORT} expands at runtime and ZAP binds
# exactly the port Railway routes the public domain to. No manual start command
# or target-port setting required.
FROM ghcr.io/zaproxy/zaproxy:stable

# ZAP_API_KEY is provided as a Railway service variable (do not hardcode it).
CMD zap.sh -daemon -host 0.0.0.0 -port ${PORT:-8080} \
    -config api.disablekey=false \
    -config api.key=${ZAP_API_KEY} \
    -config api.addrs.addr.name=.* \
    -config api.addrs.addr.regex=true \
    -config telemetry.enabled=false
