# UX/UI Research Notes (Feb 2026)

## Scope
- Modern UX patterns for SaaS-like flows (forms, navigation, data-heavy admin screens)
- Styling stack options for Next.js + Expo (hybrid design system direction)

## Key findings

### 1) Focus states and accessibility cannot be optional
- WCAG 2.2 reinforces visible focus indicators and minimum contrast/area requirements.
- Practical impact: keep strong focus rings, not only border color changes.

Source:
- https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

### 2) Native controls should respect explicit color-scheme
- Browser/OS native popup controls (`select`) can flash mismatched theme if `color-scheme` is ambiguous.
- Practical impact: force `color-scheme` and explicit option backgrounds per theme.

Source:
- https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme

### 3) Animation quality depends on restraint and intent
- Motion should improve clarity, not add rendering cost in core navigation.
- Practical impact: avoid mounting heavy animation components in frequently toggled UI regions.

Source:
- https://m3.material.io/styles/motion/overview

### 4) "Hybrid UI library" decisions need critical validation from practitioners
- Official docs show strong capabilities, but community threads highlight tradeoffs:
  - Tamagui: powerful cross-platform API, but complexity/migration concerns appear in long discussions.
  - NativeWind: high DX for Tailwind users, but edge cases and runtime behavior are recurring topics in issues.

Forum/discussion references:
- https://github.com/tamagui/tamagui/discussions/1489
- https://github.com/nativewind/nativewind/issues/1540
- https://github.com/dcastil/ui-benchmarks

## Styling stack options (web + mobile)

### Option A: Current stack, stronger design-system discipline (recommended now)
- Web: Next.js + Tailwind + custom primitives
- Mobile: Expo + RN primitives
- Shared: token package in `@navaja/shared`
- Pros: no migration risk, immediate ROI, incremental rollout
- Cons: custom maintenance burden

### Option B: NativeWind for utility-first parity (web-like mental model)
- Useful when team wants Tailwind-like ergonomics in Expo.

Source:
- https://www.nativewind.dev/

### Option C: Tamagui for unified component system (web + native)
- Full cross-platform design system and runtime optimizations.
- Higher adoption cost but strongest long-term unification.

Source:
- https://tamagui.dev/

### Option D: gluestack-ui (cross-platform components)
- Prebuilt accessible primitives across web/native, design-system oriented.

Source:
- https://gluestack.io/ui/docs/home/overview/introduction

## Recommended roadmap
1. Stabilize current primitives + shared tokens (done in this iteration).
2. Keep web and mobile palettes/radii in `@navaja/shared/theme`.
3. If team wants deeper hybrid convergence:
   - Pilot Tamagui or NativeWind on 1 module (`/login` + mobile login) before full migration.
