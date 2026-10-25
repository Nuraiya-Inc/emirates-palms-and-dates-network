# Deploy — ntrp.nuraiya.ai (alias naseej.nuraiya.ai)

Target: Coolify v4 (Traefik). This app deploys as a **separate Coolify app with
its own Postgres** — zero contact with EPDN or any other app or database on the box.

## 0. DNS (do first)

Cloudflare → nuraiya.ai:
- `ntrp` → A record → the Coolify VPS public IP, **grey cloud** (Traefik terminates TLS).
- `naseej` → CNAME → `ntrp.nuraiya.ai`, grey cloud (optional alias).

## 1. Coolify — Postgres

Coolify → your project → **+ New → Database → PostgreSQL**
- Name: `ntr-db` · database `ntr` · user `ntr`
- Start it, copy the **internal** connection string.

## 2. Coolify — the app

**+ New → Application → Private repository** → `Nuraiya-Inc/emirates-palms-and-dates-network`,
branch **`naseej`**, Build Pack: **Dockerfile**. (Once the code has its own
repository, repoint the app there; nothing else changes.)

- **Resources:** memory limit 4–6 GB (Next.js build needs it).
- **Environment variables** (verify each one saved — the env UI can be flaky):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the internal Postgres URL from step 1 |
| `AUTH_SECRET` | fresh: `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | a dedicated key for this platform |
| `CRON_SECRET` | fresh random string |
| `SEED_CEO_EMAIL` | nima.vakili@kmigroup.com |
| `SEED_CEO_NAME` | Nima Vakili |
| `SEED_CEO_PASSWORD` | fresh — never reuse another platform's |
| `CANONICAL_URL` | `https://ntrp.nuraiya.ai` (only needed if you serve from a different host) |

- **Domains:** `https://ntrp.nuraiya.ai,https://naseej.nuraiya.ai`
  The image's CMD exports NEXTAUTH_URL/AUTH_URL for `ntrp.nuraiya.ai`; sign-in
  redirects land there. If you want `naseej.nuraiya.ai` to be the canonical host
  instead, set `CANONICAL_URL=https://naseej.nuraiya.ai` and edit the CMD line
  in the Dockerfile.
- Enable the GitHub webhook so every push to `naseej` auto-deploys.

## 3. First boot

Deploy. This branch ships **no migrations folder**, so `prisma/boot.sh` runs
`prisma db push` against the fresh database on first boot. Then open the app's
**Terminal**:

```bash
npm run db:seed                      # admin + demo official/partner, agents, baseline, demo participants
npm run db:seed-demo                 # 4 quarters of diversion history, transfers, pickups, listings
npx tsx scripts/seed-directory.ts    # textile recovery directory (staff-only)
```

Logins: admin = SEED_CEO_EMAIL/PASSWORD · official demo.official@naseej.nuraiya.ai
(`<pw>-ntr`) · partner demo.hotel@partners.naseej.nuraiya.ai (`<pw>-hotel`).
Rotate all three after first sign-in.

## 4. Scheduled task

Coolify → app → Scheduled Tasks → name `standing-review`, frequency `0 4 * * 1`:

```
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/standing-review
```

## 5. Verify

`https://ntrp.nuraiya.ai/api/health` → `{"status":"ok"}`. Sign in, check
`/directory`, `/partners`, `/dashboard` (indicative emirate baseline, measured
coverage at zero until reports land). Phone: `/portal` in Arabic RTL with the
عربي|EN toggle; chat with Noura; request a pickup; download the member card.
`npm run demo:reset` between demo rehearsals.

---

**Alternative:** `docker-compose.yml` deploys app + Postgres as a single
compose resource instead of two separate ones — same env vars, `db` service
handles Postgres. Use whichever the Coolify project convention prefers.
