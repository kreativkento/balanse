# Deploying BALANSÉ to production (Cloudflare)

This app is a **static Vite + React SPA**. For production, use **Cloudflare Pages**, not Workers.

## Pages vs Workers — which to use?

| | **Cloudflare Pages** (recommended) | **Cloudflare Workers** |
|---|-----------------------------------|------------------------|
| Best for | Static sites & SPAs (React, Vite, etc.) | APIs, edge logic, server-side code |
| Config | Build command + output folder | `wrangler.toml` + deploy command |
| Your app | ✅ Perfect fit | ❌ Overkill; caused your build error |
| Cost | Generous free tier | Generous free tier |

**Use Pages for BALANSÉ production.** Workers are for when you need server code running at the edge. This project only needs HTML/JS/CSS from `dist`.

---

## Production setup — Cloudflare Pages (recommended)

### Step 1: Create a Pages project (if you don’t have one yet)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **Create** → choose **Pages** (not Workers)
3. Click **Connect to Git**
4. Select **GitHub** → authorize → choose repo **`kreativkento/balanse`**
5. On the build settings screen, set:

| Setting | Value |
|---------|--------|
| Production branch | `main` |
| Framework preset | **Vite** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

6. Click **Save and Deploy**

Pages will **not** show a “Deploy command” field — that’s normal. It builds and publishes `dist` automatically.

### Step 2: If you already created a **Worker** project by mistake

Your current UI (Build command + **Deploy command** + Non-production deploy command) is a **Worker** setup. That’s why `npx wrangler deploy` failed.

**Fix:** create a new **Pages** project (steps above) connected to the same GitHub repo. You can pause or delete the old Worker project so only Pages deploys on push.

Do **not** use these on Pages — they are Worker-only:

- ~~`npx wrangler deploy`~~
- ~~`npx wrangler versions upload`~~

### Step 3: Environment variables (required for Supabase)

In your **Pages** project → **Settings** → **Environment variables**, add for **Production** and **Preview**:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

Then go to **Deployments** → **Retry deployment** (or push a commit) so the build picks them up.

### Step 4: Custom domain (optional)

**Pages project** → **Custom domains** → add your domain (e.g. `balanse.com` or `www.balanse.com`).

---

## If you must stay on Workers Builds (not recommended)

Only use this if you cannot switch to Pages.

| Field | Value |
|-------|--------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | *(empty)* |
| Path | `/` |

You would also need a `wrangler.toml` with `[assets] directory = "./dist"`. Pages avoids all of this.

---

## SPA routing

`public/_redirects` is copied into `dist` on build so routes like `/login` and `/admin-dashboard` work when users refresh or open a direct link.

---

## Verify locally before deploying

```bash
npm install
npm run build
```

Check that `dist/index.html` and `dist/assets/` exist.

---

## Quick checklist

- [ ] Project type is **Pages**, not Workers
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] No deploy command (Pages handles upload)
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Cloudflare
- [ ] Latest code pushed to `main` on GitHub
