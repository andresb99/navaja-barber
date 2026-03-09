# Mobile Application Agent Rules

This directory contains the React Native mobile application for the Navaja barber SaaS platform.

The mobile app is a native client of the same platform implemented in the web app.

The web application is the primary reference for business logic and feature behavior.

---

# Preferred Engineering Skill

When working in this directory always prefer using:

react-native-monorepo-web-parity

This skill is responsible for:

- implementing React Native features
- replicating web functionality in mobile
- reading the web implementation in the monorepo
- reusing shared logic
- adapting the UX for native mobile environments

---

# Web Parity Rule

The web application located in `apps/web` is the reference implementation.

Before implementing any mobile feature:

1. inspect the corresponding feature in the web app
2. understand the business logic
3. identify reusable shared logic in the monorepo
4. replicate the same behavior in mobile
5. adapt the interface to native mobile UX

The goal is to maintain **behavioral parity** between web and mobile.

Do not blindly copy UI from web — translate it into a native experience.

---

# Monorepo Guidelines

This project uses a monorepo architecture.

Whenever possible:

- reuse shared packages
- reuse TypeScript types
- reuse validation schemas
- reuse API contracts
- reuse utilities
- reuse business logic

Avoid duplicating logic that already exists in:

packages/
or
apps/web/

If business logic exists only inside web components, consider extracting it into a shared module.

---

# Core Product Features

The mobile app should support key product flows such as:

- barber shop discovery
- booking appointments
- managing reservations
- viewing barber availability
- managing client profiles
- notifications
- viewing barber shops and reviews

Ensure that these flows match the web behavior.

---

# UX Principles

Mobile UX should prioritize:

- touch-friendly interactions
- simple navigation
- fast loading
- minimal friction
- clear booking flows

Avoid desktop-style layouts.

Translate complex web screens into simpler mobile-native experiences.

---

# Performance

Mobile devices are more constrained than desktop browsers.

Avoid:

- unnecessary re-renders
- heavy screens
- inefficient lists
- expensive computations during render

If performance issues appear prefer using:

frontend-performance-engineer

---

# QA

Before finishing any feature verify:

- booking flows
- loading states
- error states
- empty states
- edge cases

Prefer using:

qa-qc-analyst

---

# Security

If changes affect authentication, permissions, or user data also involve:

saas-security-reviewer

---

# Important Rule

The mobile app must remain a native client of the same SaaS platform.

Maintain feature parity with the web app while adapting the experience for mobile users.