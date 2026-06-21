# Cloudflare Cache Rules

Use these rules after the domain is proxied through Cloudflare. Keep the order
conservative: private API and upload paths are bypassed first, static frontend
assets are cached aggressively, and signed MinIO media keeps query strings in
the cache key.

## Upload Limit

Cloudflare proxied request body limits are plan dependent:

- Free: `100 MB`
- Pro: `100 MB`
- Business: `200 MB`
- Enterprise: `500 MB` by default

This project intentionally uses a `95MB` video file limit with a `100MB`
request body limit in Spring and Nginx. Do not raise only Spring or Nginx while
uploads still pass through a Free or Pro proxied Cloudflare hostname.

For larger videos, use one of these paths instead:

- Chunked upload with each chunk below the Cloudflare limit.
- A DNS-only upload hostname that bypasses Cloudflare proxy.
- Cloudflare Stream, R2 direct upload, or another S3-compatible direct upload
  path where the app signs the upload and records metadata.
- A higher Cloudflare plan, with frontend, Spring, and Nginx limits updated
  together.

## Rule Order

Create Cache Rules in this order. Earlier bypass rules should be above broad
cache rules.

### 1. Bypass Authenticated API

Expression:

```text
http.request.uri.path starts_with "/api/"
```

Settings:

- Cache eligibility: `Bypass cache`

Reason:

All API responses include session state, permissions, upload signing, or media
authorization. They should not be edge cached.

### 2. Cache Next.js Static Assets

Expression:

```text
http.request.uri.path starts_with "/_next/static/"
```

Settings:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `1 year`
- Browser TTL: respect origin or set a long TTL

Reason:

Next.js static assets are content hashed. They are safe to cache for a long
time.

### 3. Signed MinIO Media

Expression:

```text
http.request.uri.path starts_with "/rinana-media/"
```

Recommended private-media setting:

- Cache eligibility: `Bypass cache`

Optional short-cache setting, only after verifying there is no private content
leak risk:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `15 minutes`
- Cache key: keep the default behavior that includes the full URL/query string.
  Do not enable `Ignore Query String`.
- If your Cloudflare plan exposes custom Cache Key query string controls, set
  query string handling to include all query string parameters.

Do not use `Ignore Query String` for signed MinIO URLs. Presigned MinIO URLs
carry authorization material in the query string. Ignoring query strings can
collapse distinct signed URLs into the same cache object and break the intended
permission boundary.

## Verification

After enabling the Cloudflare proxy:

```bash
curl -I https://lingnaive520.uk/zh
curl -I https://lingnaive520.uk/_next/static/
curl -I https://lingnaive520.uk/api/auth/me
curl -I "https://lingnaive520.uk/rinana-media/<signed-object-url>"
curl -H "Range: bytes=0-1023" -I "https://lingnaive520.uk/rinana-media/<signed-object-url>"
```

Expected:

- `/api/*` should show `cf-cache-status: DYNAMIC` or otherwise not be cached.
- `/_next/static/*` should become cacheable and eventually return `HIT`.
- `/rinana-media/*` must preserve byte range behavior for MP4 seeking.
- `Range` requests should return `206 Partial Content` when the object exists
  and the origin supports the requested range.

## References

- Cloudflare 413 upload limits: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/
- Cloudflare Cache Rules: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cloudflare Cache Rule settings: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- Cloudflare cache keys and query strings: https://developers.cloudflare.com/cache/how-to/cache-keys/
