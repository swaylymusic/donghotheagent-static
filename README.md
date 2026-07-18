# Dongho Lee Real Estate Static Site

Static Astro site for `donghotheagent.com`, designed for GitHub and Cloudflare Pages.

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Contact Form

The Contact page posts to the Cloudflare Pages Function at `/api/contact`.

Required for live email delivery:

- `RESEND_API_KEY`: Resend API key used to send contact form emails.

Optional:

- `CONTACT_TO_EMAIL`: recipient address. Defaults to `contact@donlee.realtor`.
- `CONTACT_FROM_EMAIL`: sender identity. Defaults to `Dongho The Agent <onboarding@resend.dev>`.
- `TURNSTILE_SECRET_KEY`: enables Cloudflare Turnstile verification when a Turnstile widget is added to the form.

Without `RESEND_API_KEY`, local submissions to `127.0.0.1` return a successful preview response so the form logic can be tested safely.
