# Aidin Caye website

Static Astro site for aidincaye.com, on Cloudflare Pages (free plan). Built from the TiMO ODV site (same stack, security setup and booking form) with a light theme.

## Local
```bash
npm ci
npm test          # booking, SMTP, email, data-parser and shows tests
npm run build     # fetches live data (keeps previous files on any failure), then builds to dist/
npm run check:launch   # lists anything still missing before the domain goes live
```

## Content
See HOW-TO-UPDATE.md. Caretaker (AI) rules: GROK-TASKS.md.

Public repository: never commit secrets, tokens, passwords or private email addresses. Secrets live only in Cloudflare and GitHub Actions secrets.
