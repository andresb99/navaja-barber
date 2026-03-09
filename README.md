# Navaja Barber Platform

Plataforma multicanal para barberias: marketplace, reservas, operacion interna, cursos, modelos, postulantes y metricas en un solo producto.

El repo esta pensado para evolucionar de MVP a producto comercial con planes escalables.

## 1) Que problema resuelve

Navaja centraliza los flujos que normalmente estan dispersos:
- Captacion de clientes y reservas online.
- Operacion diaria de equipo (agenda, estados, ausencias).
- Expansion de negocio (cursos, modelos de practica, bolsa de trabajo).
- Relacion con cliente (notificaciones, historial, resenas).
- Control financiero y operativo (KPIs, productividad, ocupacion).

Resultado: menos carga operativa manual, mejor conversion de reservas y mas control sobre la rentabilidad.

## 2) Funcionalidad por tipo de usuario

### Cliente final (web + mobile)
- Buscar barberias en mapa y marketplace.
- Reservar turno en flujo guiado.
- Gestionar su cuenta y ver historial.
- Recibir notificaciones de cambios de cita.
- Dejar resena cuando la cita se completa.
- Ver cursos y postularse como modelo o postulante laboral.

### Staff / Barbero
- Ver agenda propia.
- Cambiar estado de citas permitidas.
- Solicitar ausencias/licencias.
- Seguir rendimiento personal (segun rol y permisos).

### Admin / Owner
- Gestion completa de citas, servicios, staff y horarios.
- Gestion de ausencias y excepciones.
- Gestion de cursos, sesiones e inscripciones.
- Gestion de convocatoria de modelos y asistencia.
- Gestion de postulantes con CV.
- Metricas de facturacion, ticket, ocupacion y rendimiento por staff.

## 3) Arquitectura tecnica

### Monorepo
- `apps/web`: Next.js (App Router) para sitio publico + panel admin/staff.
- `apps/mobile`: Expo Router para experiencia mobile.
- `packages/shared`: contratos compartidos (schemas zod, tipos, utilidades).
- `supabase`: migraciones SQL, RLS, seed y funciones de negocio.

### Stack principal
- Next.js 16 + React 19 + TypeScript.
- Expo + React Native.
- Supabase (Postgres, Auth, Storage, RLS).
- HeroUI + Tailwind para UI web.
- pnpm workspaces + Turborepo.

### Patrons de integracion
- Server Actions y API routes en web.
- Mobile consume API web cuando aplica (`EXPO_PUBLIC_API_BASE_URL`).
- Validacion de payloads con schemas compartidos.
- Seguridad por RLS + validaciones de rol/tenant en servidor.

## 4) Multi-tenant y seguridad

El sistema opera por workspace de barberia:
- Aislamiento por `shop_id` y `shop_slug`.
- Membresias por usuario (`shop_memberships`) con estado (`invited`, `active`, etc.).
- Roles operativos (`admin`, `staff`, `user`) con rutas y acciones restringidas.
- Politicas RLS para operaciones publicas y privadas.
- Uso de service role key solo del lado servidor.

## 5) Modulos funcionales (resumen)

| Modulo | Objetivo | Valor de negocio |
| --- | --- | --- |
| Marketplace + mapa | Descubrir barberias por zona/viewport/busqueda | Captacion y conversion |
| Reservas | Tomar turnos y asignar staff | Ingreso directo |
| Operacion de citas | Confirmar/cancelar/finalizar/no-show | Orden operativo |
| Notificaciones de cuenta | Eventos de cita y solicitud de resena | Retencion y NPS |
| Servicios | Catalogo editable por shop | Control de oferta y margen |
| Staff + horarios | Disponibilidad por rango de dias + excepciones | Menos friccion operativa |
| Cursos | Venta de formacion y sesiones | Nueva linea de ingresos |
| Modelos | Cobertura de demanda para practica | Escalabilidad academica |
| Postulantes | Pipeline de talento con CV | Contratacion mas rapida |
| Metricas | Facturacion, ocupacion, ticket, rendimiento | Decisiones con datos |

## 6) API y backend (web)

Rutas API relevantes:
- `/api/availability`
- `/api/bookings`
- `/api/shops/search`
- `/api/shops/viewport`
- `/api/account/appointments`
- `/api/account/reviews`
- `/api/account/invitations/respond`
- `/api/review/preview`
- `/api/review/submit`
- `/api/courses/enroll`
- `/api/modelos/registro`
- `/api/jobs/apply`
- `/api/jobs/network`
- `/api/onboarding/barbershop`
- `/api/admin/barbershop`

## 7) Modelo de datos (Supabase)

Entidades base:
- `shops`, `shop_memberships`, `shop_locations`, `subscriptions`
- `staff`, `working_hours`, `time_off`
- `services`, `customers`, `appointments`
- `appointment_reviews`, `review_invites`, `account_notifications`
- `courses`, `course_sessions`, `course_enrollments`
- `models`, `model_requirements`, `model_applications`, `waivers`
- `job_applications`, `marketplace_job_profiles`, `marketplace_models`
- `user_profiles`, `shop_gallery_images`

Storage:
- `cvs` (privado)
- `public-assets` (publico)

## 8) Moneda y facturacion

- Moneda visible en producto: `UYU` (pesos uruguayos).
- Formato visual: locale `es-UY`.
- Persistencia en DB: campos `*_cents` para precision y consistencia.
- Inputs de admin en UI se cargan en pesos, y se convierten internamente a cents.

## 9) Flujo de notificaciones y resenas

Cuando cambia el estado de una cita:
- Se genera notificacion de cuenta para el cliente (`confirmed`, `cancelled`, `done`, `no_show`).
- Al finalizar cita se dispara solicitud de resena.
- Al abrir/enviar resena se marca la notificacion correspondiente como leida.

Esto vive en:
- tabla `account_notifications`
- trigger SQL en `appointments`
- lectura/acciones en web y mobile.

## 10) Mapas y descubrimiento

La experiencia de mapa combina:
- Busqueda de ubicaciones (zonas, direcciones, intersecciones).
- Busqueda por nombre de barberia.
- Carga de barberias por viewport (lo visible en mapa).
- Estilos por tema (light/dark) para mantener coherencia visual.

Variables de entorno de mapas:
- web: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- mobile: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

## 11) Estructura de carpetas

```text
apps/
  web/
  mobile/
packages/
  shared/
supabase/
  migrations/
  seed.sql
docs/
```

## 12) Requisitos de entorno

- Node.js 20+
- pnpm 10+
- Proyecto Supabase (cloud o local)
- Opcional: Supabase CLI

## 13) Instalacion y setup local

### 13.1 Instalar dependencias

```bash
pnpm install
```

Si pnpm pide aprobaciones de build:

```bash
pnpm approve-builds
```

### 13.2 Variables de entorno

Copiar:
- `apps/web/.env.example` -> `apps/web/.env.local`
- `apps/mobile/.env.example` -> `apps/mobile/.env`

#### Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REVIEW_LINK_SIGNING_SECRET=
NEXT_PUBLIC_SHOP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

#### Mobile (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SHOP_ID=
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Nota:
- `EXPO_PUBLIC_API_BASE_URL` debe apuntar a la web (local o deploy) para endpoints de cuenta/reservas/reviews.
- `NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN` define el dominio base para resolver subdominios del marketplace y reservar hosts internos frente a custom domains.

### 13.3 Base de datos

Opcion SQL Editor:
1. Ejecutar migraciones de `supabase/migrations` en orden.
2. Ejecutar `supabase/seed.sql` (opcional para datos demo).

Opcion CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
psql "<postgres-connection-string>" -f supabase/seed.sql
```

## 14) Desarrollo local

Todo el monorepo:

```bash
pnpm dev
```

Solo web:

```bash
pnpm --filter @navaja/web dev
```

Solo mobile:

```bash
pnpm --filter @navaja/mobile dev
```

## 15) Calidad, testing y comandos

Comandos raiz:
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm coverage`

## 16) Deploy

### Web (Vercel)
1. Importar repo.
2. Root directory: `apps/web`.
3. Cargar envs de web.
4. Deploy.

Para custom domains de tenants Business:
- Revisa `docs/custom-domains.md`.
- Agrega cada dominio manualmente en Vercel y configura el DNS con el target que Vercel indique.
- Luego activa el dominio desde `admin/barbershop`.
- Verifica en Search Console el dominio principal y, si usas custom domains reales, cada host importante con su propio `/sitemap.xml`.

### Mobile (Expo EAS)
1. `npx expo login`
2. Configurar credenciales/profiles.
3. Build:

```bash
pnpm --filter @navaja/mobile exec eas build --platform ios --profile production
pnpm --filter @navaja/mobile exec eas build --platform android --profile production
```

## 17) Propuesta de evolucion comercial (Pro / Business)

Estas ideas estan alineadas con la arquitectura actual y pueden implementarse incrementalmente.

### Plan Pro (1 local o cadena chica)
- Recordatorios automaticos por WhatsApp/SMS/email (24h y 2h antes).
- Politicas de no-show: senias, penalizaciones, bloqueos suaves.
- Campanas de retencion: reactivacion de clientes inactivos.
- Segmentacion de clientes por ticket/frecuencia/servicio.
- Dashboards avanzados por staff y servicio (margen, recurrencia, cancelaciones).
- Automatizacion de resenas (solicitud inteligente segun estado real).
- Exportes avanzados (CSV/Excel) con filtros guardados.

### Plan Business (multi-sucursal / operacion grande)
- Multi-sucursal real con consolidado ejecutivo y comparativas entre locales.
- Presupuestos, metas y alertas por sucursal/equipo.
- Integraciones enterprise (POS, ERP, payroll, CRM) via API/webhooks.
- RBAC avanzado (roles personalizados + permisos granulares).
- Auditoria completa (quien hizo que, cuando, desde donde).
- SSO (Google Workspace / Microsoft) y seguridad enterprise.
- SLA, soporte prioritario y onboarding dedicado.
- White-label (dominio y branding corporativo).

---

Si quieres convertir este README en material comercial/tactico (deck de ventas + pricing page), la base de este documento ya esta lista para eso.
