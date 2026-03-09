# Custom Domains

## Runtime resolution

Public tenant routing now resolves in this order:

1. `custom_domain` on `shops`, using normalized host matching and requiring:
   - `shops.status = 'active'`
   - `subscriptions.plan = 'business'`
   - `subscriptions.status in ('active', 'trialing')`
   - `domain_status in ('verified', 'active')`
2. Platform subdomain fallback, using the incoming host label before `NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN`.
3. Existing path-based tenant routes (`/shops/[slug]`) remain unchanged and keep working.

`proxy.ts` injects the resolved tenant into request headers and rewrites public host-scoped URLs like `/`, `/book`, `/courses/:id`, `/jobs`, and `/modelos/registro` back into the existing `/shops/[slug]/...` routes.

## Canonical public URLs

Each tenant still has a single canonical public URL for SEO and external sharing:

1. Active `custom_domain` if the tenant is eligible for Business custom domains.
2. Platform subdomain: `slug.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN`.
3. Legacy `/shops/[slug]` only when host-based routing is not safe, such as Vercel preview deployments or local fallbacks.

The marketplace itself keeps using `/shops/[slug]` paths so browsing between tenants stays inside the main app origin and avoids full cross-domain navigations. The tenant pages now publish canonical metadata that points to the canonical host, so SEO and shared links consolidate on the tenant host without forcing marketplace users through redirects.

## SEO behavior

- Marketplace pages (`/shops`, `/book`, `/courses`, `/jobs`, `/modelos`, `/suscripcion`) stay indexable on the platform host.
- Tenant profile/content pages publish canonical metadata to the tenant host (`custom_domain` or `slug.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN`).
- Transactional and private pages are marked `noindex`, including booking success, course enrollment success, review tokens, login, admin, staff, onboarding, account, and workspace management areas.
- `robots.txt` and `sitemap.xml` are now host-aware:
  - on the platform host they describe the marketplace plus tenant canonical URLs
  - on a tenant subdomain or custom domain they collapse to that tenant only

Recommended operational setup:

1. Verify the main platform domain in Search Console.
2. Verify important custom domains as separate properties when tenants use them in production.
3. Submit `/sitemap.xml` from each verified host if you want domain-level reporting for tenant custom domains.

## Business gating

- Only `business` tenants can save or activate `custom_domain`.
- The admin UI shows a disabled state and upgrade message for every other plan.
- The API enforces the same rule server-side, so client-side changes cannot bypass the gate.
- Duplicate domains and reserved/internal platform hosts are rejected before saving.

## Manual Vercel setup

This implementation is intentionally app-side first. Domain provisioning is still manual in Vercel, but the code now has a provider abstraction in `apps/web/lib/custom-domain-provider.ts` so Vercel API automation can be added later.

Current manual flow:

1. Set `NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN` to your platform base domain (for example, `beardly.com`).
2. In the tenant admin settings, save the desired custom domain.
3. Add that same domain to the Vercel project manually.
4. Configure the DNS records exactly as Vercel instructs for that domain.
5. Return to the tenant admin settings and activate the domain.

Notes:

- Success URLs for bookings and course enrollments now use the incoming request origin, so custom-domain traffic returns to the same host after checkout.
- Webhook callbacks still target `NEXT_PUBLIC_APP_URL`, which keeps provider callbacks pinned to the platform host.
