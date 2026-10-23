# PRD (compact)

## Positioning
Client-ready website health monitoring for small agencies (5-50 client sites).
First paid promise: "Know when a client site's speed, SEO basics, HTTPS or security posture changes, and send the client a branded report with prioritized fixes."
Security is the retention layer, not the lead pitch.

## Users
Primary: small web/SEO agencies and freelancers. Secondary: small business/e-commerce owners. Later: devs/security teams (API, CI).

## MVP scope (v1 only)
| Area | Scope |
|---|---|
| Acquisition | Public URL scan, readable results, shareable report |
| Performance | PageSpeed Insights API, mobile+desktop, Core Web Vitals |
| SEO basics | title, description, headings, canonical, robots/indexability, broken links (bounded) |
| Security posture | HTTPS, cert expiry, core headers, cookie flags, SPF/DMARC |
| Platform | login, workspaces, sites, scan history, findings, quotas |
| AI | evidence-linked explanation, priority, remediation checklist |
| Agency | scheduled scans, change alerts, branded PDF, monthly email summary |
| Billing | Razorpay plans, entitlements, webhook-driven state |

## Free scan is a funnel
Show top issues + health snapshot + sample history. Account required to save site, schedule, export PDF. 14-day agency trial: 3 sites. No unlimited crawl/AI/PDF.

## Agency report must have
White-label logo/colors; "what changed since last month"; prioritized fixes; owner+status per finding; evidence per finding; PDF + shareable link; scheduled monthly email.

## Plans (HYPOTHESES, config in packages/shared/plans.ts)
Free Rs0: 1 public snapshot, limited checks, no history.
Solo Rs499/mo: 3 sites, weekly scans, 100 crawled pages/mo, 30-day history.
Agency Starter Rs1499/mo: 10 sites, monthly client reports, basic white-label, 500 pages/mo.
Agency Pro Rs4999/mo: 30 sites, team seats, full white-label, alert rules, pooled crawl allowance.

Alt hypothesis to A/B later (AI-operator framing): Starter Rs799 (1 site, weekly, 30 investigations), Pro Rs1999 (5 sites, daily, 150 investigations + deep credits), Agency Rs5999 (25 sites, 500 investigations, white-label). Investigation = bounded unit (see AI-OPERATOR). Never advertise unlimited AI.

## Out of scope for MVP
Active/exploit testing, port scans, authenticated scans, Android app (PWA later), public API, auto-modifying live sites.

## Metrics
visitor->scan, scan completion rate, free->paid, active paid, MRR, churn, cost per completed scan, false-positive rate, time to first result, issues resolved+reverified.

## Validation milestone (business, not code)
10 manual audits, 3-5 paid pilots, 1+ agency renews after month 1.
