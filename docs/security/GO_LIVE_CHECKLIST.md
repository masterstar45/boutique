# Go-Live Security and Reliability Checklist

## Pre-Deploy
1. Confirm branch is up to date and latest security commits are deployed.
2. Ensure production env values are set:
- NODE_ENV=production
- JWT_SECRET
- TELEGRAM_BOT_TOKEN
- CLOUDFLARE_TURNSTILE_SECRET_KEY
- CLOUDFLARE_TURNSTILE_SITE_KEY
- CORS_ALLOWED_ORIGINS
- OXAPAY_API_KEY
- OXAPAY_STRICT_HMAC=true
- TELEGRAM_ADMIN_CHAT_ID

## Automated Validation
1. Run configuration checks:
- pnpm --filter @workspace/scripts run security-check

2. Run post-deploy smoke checks:
- API_BASE_URL=https://your-api-domain pnpm --filter @workspace/scripts run smoke

Optional tokens for deeper checks:
- USER_TOKEN=... (valid non-admin token)
- ADMIN_TOKEN=... (valid admin token)

## Functional Validation
1. Telegram login works and issues token.
2. Payment flow reaches confirmed state.
3. Download works for owner account only.
4. Non-admin cannot access admin endpoints.
5. Product images render and stock files remain protected.

## Observability
1. Confirm alerts are received for rejected webhook signatures.
2. Confirm alerts are received for blocked admin role mutations.
3. Confirm alerts are received for rate-limit events.

## Backup and Recovery
1. Run database backup job once manually before opening traffic.
2. Validate restore procedure in staging at least once.

## Launch Gate
Go live only if all checks pass with zero critical failures.
