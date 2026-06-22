# Nexus Web App — server requirements (for stable, performant operation)

## The guiding principle: the web server is light
The hosted web app is a **Next.js server** doing: page rendering (SSR), auth callbacks,
Stripe webhooks, and serving the studio UI. It does **NOT**:
- run any GPU work,
- store model weights,
- run generation itself (MVP = users' own API keys, called from the browser direct to the
  provider; later, managed GPU lives on **Modal/Beam**, called over HTTP — never on this box).

So sizing is modest. The heavy/expensive stuff is deliberately *off* the web server.

> Assumption: generated images/video are fetched by the **browser** straight from the provider
> (or object storage), not proxied through the Node server. If you ever proxy media or add
> server-side generation, bandwidth/CPU go up (and GPU still goes to Modal/Beam, not here).

## Compute sizing (Next.js / Node app server)

| Stage | vCPU | RAM | Notes |
|---|---|---|---|
| **Minimum (dev / first users)** | 1 | 2 GB | Tight; fine for a handful of concurrent users. |
| **Recommended start** | 2 | 4 GB | Comfortable SSR headroom; run 2 Node workers. |
| **Growth (hundreds of concurrent)** | 4 | 8 GB | Or scale **horizontally** (2x the 2vCPU/4GB box) behind a load balancer. |

- Node baseline ~0.5–1 GB; SSR concurrency wants headroom → 4 GB is the sweet spot to start.
- Run **one Node process per vCPU** (cluster mode / multiple PM2 instances) to use all cores.

## Disk
- **20–40 GB SSD** is plenty: OS + Node + the built app + logs. No models here.
- Put **static assets and any user media on object storage (Alibaba OSS)** + a **CDN**, not local
  disk — keeps the server stateless and fast.

## Network / bandwidth
- Mostly HTML/JS/CSS (modest). Generated media does **not** flow through the server in the MVP.
- Put a **CDN** in front of static assets to cut origin load and latency.

## Runtime stack (recommended)
- **OS:** Ubuntu 22.04 LTS (or Alibaba Linux 3).
- **Node:** 20 LTS.
- **Reverse proxy:** Nginx in front, terminating **TLS** (Let's Encrypt or an Alibaba cert).
- **Process mgmt:** **PM2** (cluster mode, auto-restart) *or* a **Docker** container managed by
  systemd/compose. Containerizing makes deploys + rollbacks clean.
- **Build/run:** `next build` then `next start` (server mode — NOT the desktop static export).

## External managed services (keep these off the web server)
- **Supabase** — Postgres + Auth + storage (managed). Pick the **region closest to your ECS** to
  minimize auth/db latency. Don't self-host Postgres on the app server.
- **Stripe** — subscriptions + webhooks. The webhook endpoint needs a **stable public HTTPS URL**,
  **signature verification**, and **idempotency** (handle retries).
- **Modal / Beam** (phase 2 only) — managed GPU for "buy compute" tiers, called from the server.

## Stability & scaling
- **Stateless app servers:** keep sessions in Supabase/JWT (no server-side session store) so you
  can run **multiple instances behind a load balancer** (Alibaba SLB/ALB) and scale out.
- **Health checks + auto-restart** (PM2 or the LB health probe) so a crashed worker recovers.
- **Rate limiting** on API/auth routes (protect against abuse — important before usage metering).
- **Graceful deploys:** build a new container/release, switch traffic, keep the old one for
  rollback. Zero-downtime if behind the LB.
- **Backups:** Supabase handles DB backups; still export periodically. Keep infra-as-config.

## Monitoring & ops
- **Error tracking** (Sentry) + **uptime monitoring** (ping the health route).
- **Structured logs** shipped off-box (Alibaba SLS or similar) — local disk fills up otherwise.
- **Alerts** on 5xx rate, CPU/RAM, event-loop lag, and Stripe webhook failures.

## Security
- **HTTPS everywhere**, HSTS, modern TLS. Secrets in **environment variables / a secret manager**,
  never in the repo.
- **Firewall / security group:** only 80/443 public; SSH locked to your IP/bastion.
- **Web Application Firewall** (Alibaba WAF) in front for basic protection.
- **API keys:** in the MVP, users' provider keys live in the **browser (localStorage)** and the
  server never sees them — minimal liability. If you later make server-side calls on users'
  behalf, you must **encrypt keys at rest** (e.g. Supabase + column encryption / KMS) and treat
  them as secrets.

## Alibaba mapping (since you're already there)
- **ECS** instance: start with a general-purpose **2 vCPU / 4 GB** (g-series) or a burstable
  **t-series** for very low traffic. Scale up or add instances + **SLB/ALB** as you grow.
- **OSS** for static assets + user media; **Alibaba CDN** in front.
- **Domain + SSL** via Alibaba; point it at the LB/ECS.
- (Optional later) **ApsaraDB for RDS (Postgres)** if you ever move off Supabase — not needed now.

## Bottom line
Start with **2 vCPU / 4 GB / 40 GB SSD**, Node 20 + Nginx + PM2 (or Docker), TLS, a CDN for static
assets, and Supabase/Stripe as managed services. That comfortably runs the auth + billing + studio
UI for your first cohort. Scale by **adding identical stateless instances behind the load
balancer** — not by making one giant box — and keep all GPU/generation off this server.
