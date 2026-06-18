# ZAP service (Railway)

Deterministic OWASP ZAP daemon for SecureApp's `zap` scan engine. Deploy this as
its **own** Railway service from the `Dockerfile` here. It binds Railway's `$PORT`
automatically, so there are **no** Start Command, target-port, or healthcheck
settings to fiddle with.

## Deploy (clean slate — avoids the multi-service confusion)
1. In Railway, **New Service → GitHub Repo →** `AbdulNandalpad/secureapp`.
2. Service **Settings → Source → Root Directory** = `zap-service` (so Railway
   builds *this* Dockerfile, not the Next.js app).
3. Service **Variables →** add `ZAP_API_KEY = <your key>`.
   (Do **not** set `PORT` — Railway injects it; the Dockerfile uses it.)
4. **Settings → Networking → Generate Domain.** Leave the port to auto-detect
   (Railway detects the `$PORT` the container binds). Do not set a target port.
5. **Delete the old image-based ZAP service(s)** so no stale domain shadows this one.

## Verify
```bash
curl -s -H "X-ZAP-API-Key: <your key>" \
  https://<new-domain>.up.railway.app/JSON/core/view/version/
# → {"version":"2.17.0"}   (Server header: Jetty(...), not railway-hikari)
```

## Wire into SecureApp (Vercel)
- `ZAP_API_URL = https://<new-domain>.up.railway.app`  (no trailing slash, no /JSON)
- `ZAP_API_KEY = <your key>`
- Redeploy the Vercel app, then pick **OWASP ZAP** in the scan form.

## Notes
- Needs ≥1.5–2 GB RAM for real scans.
- `telemetry.enabled=false` silences the harmless callhome 500s in the logs.
