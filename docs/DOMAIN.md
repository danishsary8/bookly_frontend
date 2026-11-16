# Domain notes

## Current domain (temporary): bookly.site
- Bought 16 Nov 2026 at Namecheap for 1 year ($0.98 + $0.20 ICANN fee). Auto-renew is OFF; renewal is about $27+/year.
- Domain privacy on. Registrant email verified 16 Nov 2026.
- Vercel project `bookly-frontend` → Domains: `www.bookly.site` (Production, main address), `bookly.site` (308 redirect to www),
  `bookly-frontend-five.vercel.app` (kept, still used).
- Namecheap → Advanced DNS records:
  - `A @ 216.198.79.1` (Vercel)
  - `CNAME www <id>.vercel-dns-017.com.` (Vercel)
  - `TXT @ google-site-verification=…` (Google Search Console; keep while the domain is used)
- Render API env: `CORS_ALLOWED_ORIGINS` includes `https://www.bookly.site,https://bookly.site,https://bookly-frontend-five.vercel.app`; `SHOP_URL=https://www.bookly.site`.
- Google Safe Browsing flagged the name on 11 Nov 2026 ("Deceptive pages"), before we bought it (previous owner).
  Review requested in Search Console on 16 Nov 2026.

## Decision for later (owner, 16 Nov 2026)
**When Bookly takes real customers, move to a `.com` (about $10/year). It is more trusted for shopping and email.**
At that time, switch everything to the new domain and remove `bookly.site`. Before buying, check the name at
https://transparencyreport.google.com/safe-browsing/search.

## Checklist: move to the new domain, then remove bookly.site
1. Buy the new domain; verify the registrant email.
2. Vercel → `bookly-frontend` → Settings → Domains → Add Existing → new domain (Connect to Production); add its DNS records
   at the registrar; wait for "Valid Configuration".
3. Render API env: add the new domain to `CORS_ALLOWED_ORIGINS`, set `SHOP_URL` to it; redeploy. (Optional: `api.` subdomain.)
4. Google sign-in (Google Cloud Console → OAuth client): add the new domain to authorised origins/redirects.
5. Email (Resend): verify the new domain (SPF/DKIM/DMARC), change the "from" address, send a test.
6. Test: shop loads, staff login, customer sign-up email, Google sign-in, checkout.
7. Optional, for a few weeks: in Vercel set `bookly.site` / `www.bookly.site` to **Redirect to Another Domain** (308) → the new
   domain, so old links still work.
8. Remove bookly.site:
   - Vercel → Domains → `bookly.site` and `www.bookly.site` → Edit → Remove.
   - Render: remove `https://www.bookly.site,https://bookly.site` from `CORS_ALLOWED_ORIGINS`; redeploy.
   - Google Cloud OAuth: remove the bookly.site origins.
   - Resend: delete the bookly.site domain (if it was added).
   - Google Search Console: Settings → Remove property (optional).
   - Namecheap: delete the DNS records; leave auto-renew OFF so it expires on its own (or keep it, if old links matter).
