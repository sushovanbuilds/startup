# Data model (start here; migrations via pnpm db:migrate)

users(id, email, name, created_at)
workspaces(id, name, owner_id, type personal|agency, branding jsonb {logo_url,primary_color}, created_at)
workspace_members(workspace_id, user_id, role owner|admin|member)
sites(id, workspace_id, url, hostname, verified bool, verified_at, created_at)
site_verifications(id, site_id, method dns_txt|file, token, status pending|verified|failed, checked_at)
scan_jobs(id, site_id, workspace_id, type snapshot|scheduled|manual, status queued|running|done|failed, attempts, error, created_at)
scan_runs(id, job_id, site_id, started_at, finished_at, summary jsonb, raw_evidence jsonb)  -- immutable
findings(id, scan_run_id, site_id, check_id, category perf|seo|security, severity info|low|medium|high, status open|resolved|accepted, confidence observed|inferred, evidence jsonb, fingerprint, first_seen_at, last_seen_at, assignee_id, ai_explanation jsonb)
reports(id, workspace_id, site_id, scan_run_id, kind pdf|share_link, token, created_at)
subscriptions(id, workspace_id, plan, status, razorpay_subscription_id, current_period_end, updated_at)
usage_counters(workspace_id, period, scans, crawled_pages, ai_calls, investigations, deep_credits, chat_messages, pdf_exports)
alerts(id, workspace_id, site_id, finding_id, kind, channel email, status, sent_at)
investigations(id, workspace_id, site_id, mode monitor|investigate|remediate|chat, model_tier, calls, tokens, cost_inr_est, status, started_at, finished_at)
audit_log(id, workspace_id, actor user|system|agent, action, tool, args_hash, result_status, created_at)
approvals(id, workspace_id, finding_id, proposed_change jsonb, status pending|approved|rejected, decided_by, decided_at)
webhook_events(id, provider, event_id UNIQUE, payload, processed_at)  -- idempotency

Indexes: findings(site_id, fingerprint), scan_runs(site_id, started_at desc), sites(workspace_id).
Use RLS or enforced workspace_id in every query helper.
