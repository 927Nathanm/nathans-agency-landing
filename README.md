# Nathan's Agency Landing Page (No Watermarks)

A clean, self-hostable rebuild of the landing page shown in the provided screenshots.

## Requirements

- Node.js 20.9+ recommended for Next.js 16
- npm (or pnpm/yarn)

## Run locally

```bash
npm install
npm run dev
```

Then open the URL shown in your terminal (usually http://localhost:3000).

## Build & start (production)

```bash
npm run build
npm start
```

## Edit your contact info

All contact details are centralized in:

- `config/site.ts`

You can also override via environment variables:

- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_CONTACT_PHONE_E164`
- `NEXT_PUBLIC_CONTACT_PHONE_DISPLAY`

## Replace images

Images live in:

- `public/images/`

You can swap these files while keeping the same filenames, or update the paths in the components.

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. In Vercel: **New Project → Import Repo → Deploy**

No watermark is added by this codebase; what you see is what you ship.
