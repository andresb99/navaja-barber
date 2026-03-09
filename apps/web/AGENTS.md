# Web Application Agent Rules

This directory contains the Next.js web application for the Navaja barber SaaS platform.

The web app is the primary implementation of the product and the reference for business logic.

When working in this directory, prefer using the following skills.

## Preferred Engineering Skill

Use:

fullstack-nextjs-heroui-supabase

This skill is responsible for:

- implementing features in the Next.js application
- working with HeroUI components
- integrating Supabase
- maintaining good React architecture
- preserving performance
- writing maintainable TypeScript code

## Product Context

This web app powers a multi-tenant SaaS platform for barber shops.

Core product areas include:

- barber shop booking system
- barber availability
- client reservations
- walk-in reservations
- barber shop analytics
- staff management
- barber marketplace
- courses and training
- customer reviews
- admin dashboards

The web app is the source of truth for product behavior.

## Technical Stack

Main technologies used:

- Next.js
- React
- HeroUI
- Tailwind CSS
- Supabase
- MapLibre
- ApexCharts
- TypeScript
- Zod validation

Testing stack:

- Vitest
- Testing Library
- Playwright

## Implementation Guidelines

When implementing or modifying code:

- preserve existing UI styling unless explicitly asked to redesign
- avoid unnecessary client components
- minimize rerenders
- prefer reusable components
- keep Supabase logic secure
- validate inputs with Zod when appropriate
- write testable code

## Performance Considerations

The following areas may require special attention:

- map rendering
- dashboard charts
- large data tables
- heavy client-side interactions

When performance issues appear prefer using:

frontend-performance-engineer

## QA

Before considering work complete always verify:

- edge cases
- loading states
- empty states
- error states

Use:

qa-qc-analyst

## Security

If changes involve authentication, permissions, or tenant isolation also use:

saas-security-reviewer

## SEO

If changes involve public pages or landing pages also use:

seo-analyst

## Important Rule

Avoid large architectural rewrites unless absolutely necessary.

Prefer incremental improvements aligned with the current stack.