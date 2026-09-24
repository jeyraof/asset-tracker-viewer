# AGENTS.md

Guidance for working in `asset-tracker-viewer`.

## This repository is PUBLIC — never commit sensitive data

This repo is public. Never commit personal or sensitive information, including:

- real portfolio data: account numbers, balances, holdings, trades, snapshots
- personal identifiers: account holder names, `alias` values, emails
- secrets and credentials: `SESSION_SECRET`, `SETUP_TOKEN`, keys, tokens
- deployment-specific values: Cloudflare account/D1/KV ids, real hostnames

Rules:

- Secrets and deployment config stay out of git: `.dev.vars`, `.setup-token`, and
  `wrangler.jsonc` are gitignored. Do not remove them from `.gitignore` or force-add them.
- `wrangler.example.jsonc` is the committed template — keep only placeholders (`<...>`),
  never real ids or hostnames.
- Tests, fixtures, and screenshots use fake/synthetic values only
  (e.g. `test-secret`, `viewer.example.com`, `005930`).
- Never paste real data into commit messages, issues, or PR descriptions.
- Before every commit, review `git status` and `git diff --staged` and scan for secrets.
- If a secret is ever committed, treat it as compromised: rotate it and purge it from history.

## Commands

- `pnpm test` — vitest.
- `pnpm typecheck` — `tsc --noEmit`.
- `pnpm dev` — local worker; `pnpm run deploy` — deploy (`pnpm deploy` collides with
  pnpm's built-in command).
- `pnpm db:migrate:local` / `pnpm db:migrate:remote` — apply `AUTH_DB` migrations.

Run `pnpm test` and `pnpm typecheck` after changes.

## Architecture rules

- **Read-only** against the shared asset database (`DB` = `asset-tracker-db`): SELECTs only,
  never writes. All writes go to `AUTH_DB` (`asset-tracker-auth`), which this repo owns.
- Auth is **passkey-only** (WebAuthn via `@simplewebauthn/server`), single user. The first
  passkey is bootstrapped with `SETUP_TOKEN`; later ones require a logged-in session.
- Sessions are a signed `__Host-session` HMAC cookie (`SESSION_SECRET`); WebAuthn challenges
  are one-time rows with a short TTL.
- **Strict CSP**: no inline scripts or styles, no external resources. Render bars/charts with
  generated CSS classes and inline SVG — never inline `style`.
- Add tables/columns only via `migrations/` against `AUTH_DB`; never edit an applied migration.
- `wrangler.jsonc` holds the real D1 ids and is gitignored; `wrangler.example.jsonc` is committed.
