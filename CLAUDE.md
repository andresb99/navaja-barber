# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                          # Run all apps in parallel (Turborepo)
pnpm build                        # Build all workspaces
pnpm lint                         # ESLint across all workspaces
pnpm typecheck                    # TypeScript check across all workspaces
pnpm format                       # Prettier formatting

# Testing (web)
pnpm test:unit                    # Unit tests (Vitest)
pnpm test:integration             # Integration tests (Vitest + RTL)
pnpm test:e2e                     # E2E tests (Playwright, builds+serves automatically)
pnpm coverage                     # All tests with V8 coverage

# Run a single test file
pnpm --filter @navaja/web vitest run test/unit/path/to/file.test.ts
pnpm --filter @navaja/web vitest run test/integration/path/to/file.test.tsx

# Per-workspace
pnpm --filter @navaja/shared test
pnpm --filter @navaja/mobile test
```

## Architecture

**Monorepo** managed with pnpm workspaces + Turborepo:
- `apps/web` — Next.js 16 / React 19 web app (App Router)
- `apps/mobile` — Expo 54 / React Native app (Expo Router)
- `packages/shared` — Cross-platform types, Zod schemas, constants (`@navaja/shared`)
- `supabase/` — PostgreSQL migrations and seed data

**Backend:** Supabase (PostgreSQL + RLS + Auth + Storage). No separate API server — Next.js API routes and server actions handle business logic.

**Multi-tenancy:** Shop-centric. Every tenant is a `shop` identified by `shop_id`/`shop_slug`. Row-Level Security enforces tenant isolation at the DB level. `shop_memberships` table defines roles.

### Web App (`apps/web`)

- **App Router** with server components and server actions
- Routes split between public marketplace and authenticated workspace (`/[shop_slug]/dashboard/...`)
- Locale-aware URLs (Spanish: `es-UY`)
- Custom domain support for tenant storefronts
- UI: HeroUI 2.x components + Tailwind CSS + Framer Motion / GSAP animations
- Charts: ApexCharts; Maps: MapLibre GL / react-map-gl
- Payments: Mercado Pago (webhooks + OAuth)

### Mobile App (`apps/mobile`)

- Expo Router for file-based navigation
- HeroUI Native RC for components; Uniwind (Tailwind for RN)
- Shares all schemas/types from `@navaja/shared`; calls same Supabase backend

### Shared Package (`packages/shared`)

Pure data layer — Zod schemas, TypeScript types, constants, helpers. No UI. Compiled separately (TS→JS); Next.js transpiles it via `transpilePackages`.

### Testing

- **Unit/Integration:** Vitest (jsdom), React Testing Library, MSW for API mocking
- **E2E:** Playwright (Chromium only, baseURL `http://127.0.0.1:3100`)
- Coverage threshold is **100%** for the files listed in `vitest.config.ts` — keep new utility files covered
- Test helpers and MSW handlers live in `apps/web/test/`

## Code Style

- Prettier: single quotes, semi-colons, trailing commas, 100-char line width
- ESLint 9 flat config — `no-console` is a warning, not an error
- TypeScript strict mode; `exactOptionalPropertyTypes` enabled
- Tailwind custom color tokens (ink, cream, brass, slate) defined via CSS HSL variables in `tailwind.config.ts`
