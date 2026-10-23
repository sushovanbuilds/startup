# Scanner safety (SSRF + abuse). Launch blocker.

## safe-fetch requirements (packages/scanner/src/net/safe-fetch.ts)
- Only http/https; ports 80/443 (allowlist, configurable).
- Resolve DNS yourself; reject if ANY resolved IP is private/loopback/link-local/CGNAT/multicast/reserved, incl. IPv6 (::1, fc00::/7, fe80::/10, IPv4-mapped), 169.254.169.254 and cloud metadata hosts.
- Connect to the validated IP (pin it; defeat DNS rebinding) while sending original Host/SNI.
- Follow redirects manually: max 5, re-validate every hop (scheme, host, IP).
- Limits: timeout 10s/request, 20s total per page, response size 2MB, crawl depth 2, max pages per plan, per-user/IP/domain rate limits, global concurrency cap.
- Reject credentials in URLs, weird encodings (decimal/octal IPs), localhost aliases.
- Never forward cookies/auth headers; set clear User-Agent with abuse contact URL.

## Required tests (block merge if missing)
127.0.0.1, ::1, 10/8, 172.16/12, 192.168/16, 169.254.169.254, metadata.google.internal, decimal/hex IP forms, DNS name resolving to private IP, public URL redirecting to private IP, rebinding simulation, oversize response, redirect loop, slow-loris timeout.

## Worker isolation
Container with no DB admin creds, no cloud metadata route, egress firewall to public internet only, non-root, read-only FS where possible, CPU/mem limits.

## Verification & scope
Recurring monitoring and any deeper checks require site_verifications = verified (DNS TXT or file). MVP never does active exploitation, brute force or port scans.

## Ops
Provider budget alerts, abuse report channel, retention policy, ToS/AUP/privacy pages before public launch. Get legal advice on India obligations (e.g., CERT-In log retention applicability).
