# Navaja Barber Monorepo

Production-oriented MVP monorepo for a barbershop platform with:
- `apps/web`: public booking + admin dashboard (Next.js App Router)
- `apps/mobile`: optional staff mobile app (Expo + Expo Router)
- `packages/shared`: shared zod schemas, inferred types, and availability algorithm
- Supabase backend (Postgres, Auth, Storage, RLS)

## Tech Stack

- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase (SSR + browser clients)
- UI system: CVA (`class-variance-authority`) + `tailwind-merge` + `@radix-ui/react-slot` + `lucide-react`
- Mobile: Expo, React Native, Expo Router, Supabase client
- Shared: TypeScript + zod
- Lint/Format: ESLint 9 (flat config) + Prettier

## Cost-First Notes (mostly free)

- `pnpm`, `Turborepo`, `TypeScript`, `Tailwind`, `Expo` are free/open-source.
- Supabase has a generous free tier (Postgres, Auth, Storage, RLS) suitable for MVPs.
- Vercel Hobby is free for early-stage web deployments.
- EAS has free workflows for development/testing; production scaling may require paid plans.
- If you want fully self-hosted/low-cost later, you can migrate to self-hosted Supabase + any Node host.

## Repository Structure

```text
/apps
  /web
  /mobile
/packages
  /shared
/supabase
  /migrations
  seed.sql
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase project (cloud or local)
- Optional for local DB workflows: Supabase CLI

## 1) Install

```bash
pnpm install
```

If `pnpm` asks for build approvals (pnpm 10 security model), run:

```bash
pnpm approve-builds
```

## 2) Environment Variables

Copy and fill env files:

- `apps/web/.env.example` -> `apps/web/.env.local`
- `apps/mobile/.env.example` -> `apps/mobile/.env`

### Web env (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SHOP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Mobile env (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SHOP_ID=
EXPO_PUBLIC_WEB_URL=
```

`EXPO_PUBLIC_WEB_URL` se usa en mobile para abrir todos los modulos web desde la app.
- Local en celular fisico: `http://<IP_DE_TU_PC>:3000`
- Deploy: `https://<tu-dominio-web>`

## 3) Supabase Setup

1. Create a Supabase project.
2. Run schema migration SQL:
   - Apply `supabase/migrations/202602220001_init.sql` in the SQL editor, or via CLI.
3. Run seed SQL:
   - Apply `supabase/seed.sql`.
4. Create auth users for admin/staff (email+password or magic link).
5. Link created auth users to rows in `staff.auth_user_id`.

### Optional CLI flow

```bash
supabase link --project-ref <your-project-ref>
supabase db push
psql "<postgres-connection-string>" -f supabase/seed.sql
```

## 4) Run in Development

Run everything:

```bash
pnpm dev
```

Run only web:

```bash
pnpm --filter @navaja/web dev
```

Run only mobile:

```bash
pnpm --filter @navaja/mobile dev
```

## Scripts

- `pnpm dev` - start workspace dev tasks
- `pnpm build` - build all apps/packages
- `pnpm lint` - lint all workspaces
- `pnpm typecheck` - TypeScript checks
- `pnpm test` - tests (shared availability unit test included)

## Supabase Data Model

Implemented tables:
- `shops`
- `staff`
- `user_profiles`
- `services`
- `customers`
- `appointments`
- `working_hours`
- `time_off`
- `courses`
- `course_sessions`
- `course_enrollments`
- `job_applications`

Storage buckets:
- `cvs` (private)
- `public-assets` (public)

RLS implemented for:
- Public booking/enrollment/application inserts
- Admin CRUD scoped by shop
- Staff read/update own appointments
- Admin access to applicants and CV signed URLs

## Feature Coverage

### Public Web

- New brand logo asset in SVG: `apps/web/public/logo-navaja.svg`
- `/login` con ingreso, registro y opcion de continuar como invitado
- `/book` multi-step booking flow:
  1. service
  2. staff or first available
  3. date + slots (15-min granularity)
  4. customer details + notes
- `/book/success`
- `/courses` list
- `/courses/[id]` details + enrollment
- `/jobs` application form + CV upload
- `/modelos` landing de convocatoria de modelos
- `/modelos/registro` formulario publico para anotarse como modelo
- `/cuenta` vista de cuenta para usuarios autenticados (rol `user`)

### Admin Web (protected)

- `/admin` overview
- `/admin/appointments` filtering + status updates
- `/admin/staff` staff CRUD + working hours + time off
- `/admin/services` service CRUD
- `/admin/courses` courses/sessions + enrollment visibility
- `/admin/modelos` gestion de modelos y notas internas
- `/admin/courses/sessions/[sessionId]/modelos` requisitos + postulaciones + asistencia
- `/admin/applicants` application pipeline + signed CV access
- `/admin/metrics` today/last7/month metrics
- `/staff` panel de staff para gestionar estado de citas propias

### Mobile Staff App

- Login
- Agenda (hoy + proximos 7 dias)
- Appointment detail + status updates (`done`, `no_show`, `cancelled`)
- Settings/profile + sign out
- Portal con acceso a todos los modulos web (publico, cuenta, staff y admin segun rol)

## Shared Package

`packages/shared` includes:
- zod schemas for inputs/models
- inferred types
- availability algorithm
- unit tests (`packages/shared/test/availability.test.ts`)

## Deployment

### Web on Vercel

1. Import this repository into Vercel.
2. Set project root directory to `apps/web`.
3. Set environment variables from `apps/web/.env.example`.
4. Deploy.

### Mobile on EAS

1. Log in to Expo: `npx expo login`
2. Configure project and credentials.
3. Build:

```bash
pnpm --filter @navaja/mobile exec eas build --platform ios --profile production
pnpm --filter @navaja/mobile exec eas build --platform android --profile production
```

## Checklist

### Implemented

- [x] Monorepo scaffold with pnpm + turbo
- [x] Shared package with typed zod schemas and availability unit test
- [x] Next.js web app with required public and admin routes
- [x] Supabase schema migration + RLS + storage policies
- [x] Seed SQL with one shop, two staff, five services, working hours, one course + session
- [x] Expo mobile app scaffold with core staff screens
- [x] Lint/format configs and env templates

### Nice-to-have / Next

- [ ] End-to-end tests for booking/admin flows
- [ ] Rich chart library integration for metrics visuals
- [ ] Background jobs (reminders, follow-ups, no-show automations)
- [ ] Stronger column-level protections for staff update scope
- [ ] CI pipeline (lint/typecheck/test/deploy)
