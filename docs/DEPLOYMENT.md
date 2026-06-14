# Deployment

The app is deployed on **Cloudflare Pages**. Builds are triggered automatically from the `main` branch of the upstream repository.

---

## Cloudflare Pages

### Build configuration

| Setting           | Value                           |
| ----------------- | ------------------------------- |
| Build command     | `npm run build`                 |
| Build output dir  | `.next`                         |
| Node.js version   | 20+                             |
| Environment vars  | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

### Environment variables

Set these in the Cloudflare Pages dashboard under **Settings → Environment variables**:

| Variable                      | Description                      |
| ----------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`    | Your Supabase project URL        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous API key |

### Notes

- `next.config.mjs` sets `outputFileTracingRoot` for Cloudflare's build environment compatibility.
- Image optimization is disabled (`images.unoptimized: true`) since Cloudflare Pages handles its own image optimization.
- The `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` flags are set to prevent build failures from non-critical warnings.

---

## Manual deployment

To deploy manually from your local machine:

```bash
npm run build
```

The output will be in the `.next` folder. Cloudflare Pages automatically detects and serves Next.js applications from this output directory.

---

## Domain

The production site is hosted at:

```
https://sgc-cahcet.pages.dev
```
