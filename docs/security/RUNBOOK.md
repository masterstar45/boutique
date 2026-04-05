# Security Incident Runbook

## Scope
This runbook covers immediate response for:
- suspected admin account compromise
- suspicious payment webhook activity
- unusual spikes in 401/403/429/500 responses
- stock file access anomalies

## Immediate Actions (first 15 minutes)
1. Freeze high-risk actions:
- temporarily disable admin role mutation endpoints at reverse proxy or WAF level
- pause payment webhook processing if spoofing is suspected

2. Rotate critical secrets:
- JWT_SECRET
- OXAPAY_API_KEY
- TELEGRAM_BOT_TOKEN
- CLOUDFLARE_TURNSTILE_SECRET_KEY

3. Force session reset:
- redeploy API after JWT rotation to invalidate old tokens
- force admin re-login

4. Preserve evidence:
- export API logs for the incident time window
- keep database backup snapshot before cleanup

## Triage Checklist
1. Confirm whether unauthorized admin role changes occurred.
2. Confirm whether payment status was changed without valid signature.
3. Confirm whether downloads were attempted from non-owner accounts.
4. Confirm whether storage upload endpoints were used by unexpected actors.

## Containment Decision Matrix
- If admin compromise confirmed:
  - remove admin rights from compromised user
  - rotate all secrets
  - keep only bootstrap admins in TELEGRAM_ADMIN_CHAT_ID
- If webhook spoof suspected:
  - verify OXAPAY_STRICT_HMAC=true and OXAPAY_API_KEY present
  - block incoming webhook requests temporarily until validated

## Recovery
1. Restore only verified valid data from backup if tampering detected.
2. Re-enable endpoints progressively and monitor alerts for 60 minutes.
3. Run smoke checks after recovery:
- pnpm --filter @workspace/scripts run security-check
- pnpm --filter @workspace/scripts run smoke

## Post-Incident (within 24h)
1. Write timeline and root cause.
2. Add one preventive control for the root cause.
3. Rotate any remaining integration tokens.
4. Update this runbook with lessons learned.
