# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express. Logs database status (product/order/user counts) on startup for deploy diagnostics.
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `artifacts/bankdata-app` (`@workspace/bankdata-app`)

React + Vite frontend with Telegram Mini App integration.

- **Storefront (mini-app)**: 8 pages in `src/pages/mini-app/` (Home, BoutiqueType, ProductDetail, Cart, Orders, Profile, Contact, Splash)
  - Layout: `src/components/layout/MiniAppLayout.tsx` — bottom nav bar with 5 items (Accueil, Panier, Commandes, Contact, Profil)
  - ProductCard: `src/components/ProductCard.tsx` — product grid cards with badges, stock bar, add-to-cart
  - Flow: Splash → Auth gate → Home → Category → Country → Products → Product detail → Cart → Balance payment
  - Design system: ultra-dark bg `hsl(240,10%,4%)`, glass cards `bg-white/[0.03] border-white/[0.06]`, gold/yellow primary, shimmer hover effects, Framer Motion animations, `font-display: Outfit`, `font-sans: DM Sans`
  - CSS utilities in `src/index.css`: `.glass-card`, `.glass-card-hover`, `.glass-panel`, `.text-gradient-gold`, `.shimmer-gold`, `.btn-primary`, `.btn-secondary`, `.input-field`
- **Admin panel**: 9 pages in `src/pages/admin/` (Dashboard, Products, Orders, Users, Promo, Admins, Affiliation, BotButtons, RubriqueCountries)
  - Layout: `src/components/layout/AdminLayout.tsx` — sidebar with collapsible navigation organized into sections (Principal, Clients, Configuration)
  - Design system: dark theme, `bg-white/[0.02]` cards with `border-white/[0.05]`, consistent table headers, primary color gold/yellow
- Auth: Telegram WebApp authentication via JWT tokens

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Schema updates: Use `pnpm --filter @workspace/db run push` (interactive, safe). `push-force` is **disabled** to prevent data loss. For schema changes with auto-backup: `pnpm --filter @workspace/db run safe-push`. Migration files are generated via `pnpm --filter @workspace/db run generate` into `drizzle/` folder.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

Available scripts:
- `db-backup` — Exports all 13 tables to a timestamped JSON file in `scripts/backups/`
- `db-restore` — Restores from the latest backup (or a specified file). Uses transactions with rollback on failure. Resets serial sequences.
