# Project Overview

## Project description

GF Restaurant App is a web app that helps people with celiac disease and gluten sensitivities find safe restaurants. Users can search for gluten-free-friendly restaurants, save favorites, post reviews, and discuss experiences with the community on a forum.

## Tech stack

**Frontend**
- [Next.js](https://nextjs.org/) (App Router)
- JavaScript (not TypeScript)
- [Tailwind CSS](https://tailwindcss.com/)
- ESLint

**Backend**
- [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/) (ES modules)
- [Mongoose](https://mongoosejs.com/) ODM
- [dotenv](https://github.com/motdotla/dotenv) for env vars, [cors](https://github.com/expressjs/cors) middleware

**Database**
- [MongoDB](https://www.mongodb.com/)

**Auth**
- Clerk (planned — see [Auth strategy](#auth-strategy))

## Repo layout

```
gf-restaurant-app/
├── frontend/            # Next.js app (App Router, JavaScript, Tailwind CSS, src/ dir)
├── backend/             # Backend API (empty for now)
├── PROJECT_OVERVIEW.md  # This file
└── README.md            # Quick-start / repo summary
```

## Frontend folder structure and conventions

- `src/app/` — Next.js App Router routes and layouts (e.g. `page.js`, `layout.js`, `globals.css`). Each folder under `app/` maps to a URL route.
- `src/components/` — Reusable, presentational React components shared across pages (e.g. `Header`, `Footer`, `RestaurantCard`, `ForumRow`). Composed together by pages in `src/app/`.
- `src/lib/` — Shared utilities and API-client helpers. Currently: `api.js`, which centralizes all backend calls (`getRestaurants`, `getRestaurantById`) and reads the backend base URL from `NEXT_PUBLIC_API_URL`.

## Frontend pages

| Path | File | Description |
| --- | --- | --- |
| `/` | `src/app/page.js` | Homepage: header, hero + search, featured restaurants, popular searches, recent forum discussions, footer. Uses placeholder data. |
| `/profile` | `src/app/profile/page.js` | Signed-in-only profile page. Client component that reads `useUser()` from `@clerk/nextjs` and shows the user's name and email. Middleware redirects signed-out visitors to Clerk's sign-in flow. |
| `/restaurants` | `src/app/restaurants/page.js` | Restaurant listing. Client component that reads text (`name`/`city`/`state`/`zip`) and category filters (`restaurantType`/`dietary`/`features` — comma-separated) from the URL query string, fetches `GET /api/restaurants` via `src/lib/api.js`, and renders results as a grid of `RestaurantCard`s. Includes a sticky **filter panel** with checkbox groups for Dietary, Restaurant Features, and Restaurant Type (sidebar on desktop, slide-out drawer on mobile via a Filters button). **Gluten Free** defaults to checked and is visually emphasized as the core filter; a "Clear all" button resets everything back to just GF. An active-filter count (excluding the always-on GF baseline) is shown near the top. Toggling any checkbox pushes a new URL query, which triggers a refetch via component-key remount. Also includes loading / empty / error states. |

## Backend folder structure and conventions

```
backend/
├── config/
│   └── db.js              # MongoDB connection helper
├── controllers/           # One file per resource — request handlers
├── models/                # Mongoose schemas / models (one per resource)
├── routes/
│   └── index.js           # Aggregates per-resource route modules into one router
├── middleware/
│   └── errorHandler.js    # Centralized Express error handler
├── utils/                 # Shared helper functions
├── validators/            # Request-body / params validation (kept separate from controllers)
├── server.js              # Entry point: loads env, wires middleware, connects DB, listens
├── .env.example           # Documented env var names (no values)
├── .env                   # Real values (git-ignored)
├── .gitignore
└── package.json
```

**Conventions**

- **ES modules** (`"type": "module"`) — use `import` / `export`, not `require`.
- **One controller file per resource** in `controllers/` (e.g. `restaurants.controller.js`).
- **One route file per resource** in `routes/`, all imported and combined in `routes/index.js`.
- **All API routes are mounted under `/api`** (e.g. `GET /api/restaurants`).
- **Validators live in `validators/`**, kept separate from controllers so request-shape rules can be reused and unit-tested independently.
- **Error handling is centralized** in `middleware/errorHandler.js`, registered last in `server.js`; throw errors with a `.status` field to control the HTTP response code.

## Data models

### User (`backend/models/user.model.js`)

| Field | Type | Notes |
| --- | --- | --- |
| `clerkUserId` | String | **required**, **unique**, indexed. Clerk's stable user id — how a `req.auth.userId` maps to a row here. |
| `email` | String | Snapshot from Clerk at creation. Not the source of truth. |
| `name` | String | Snapshot from Clerk at creation. |
| `favorites` | [ObjectId] | Refs to `Restaurant` docs. Enables `.populate("favorites")` later. Default `[]`. |
| `createdAt` | Date | auto (via `timestamps`) |
| `updatedAt` | Date | auto (via `timestamps`) |

Users are **lazy-created** on first authenticated request via `backend/utils/getOrCreateUser.js`, which fetches email/name from Clerk on insert. See [Auth strategy](#auth-strategy).

### Restaurant (`backend/models/restaurant.model.js`)

| Field | Type | Notes |
| --- | --- | --- |
| `name` | String | **required**, trimmed |
| `description` | String | |
| `address.street` | String | |
| `address.city` | String | |
| `address.state` | String | |
| `address.zip` | String | |
| `address.country` | String | |
| `location.type` | String | GeoJSON, enum `["Point"]`, default `"Point"` |
| `location.coordinates` | [Number] | `[longitude, latitude]`, indexed as `2dsphere` |
| `phone` | String | |
| `website` | String | |
| `imageUrl` | String | |
| `cuisine` | [String] | default `[]` |
| `restaurantType` | [String] | enum: `breakfast`, `lunch`, `dinner`, `bakery`, `coffee_shop`, `fast_food`, `dessert`, `fine_dining` |
| `dietary.glutenFree` | Boolean | default `false` |
| `dietary.dairyFree` | Boolean | default `false` |
| `dietary.eggFree` | Boolean | default `false` |
| `dietary.nutFree` | Boolean | default `false` |
| `dietary.peanutFree` | Boolean | default `false` |
| `dietary.treeNutFree` | Boolean | default `false` |
| `dietary.soyFree` | Boolean | default `false` |
| `dietary.vegetarian` | Boolean | default `false` |
| `dietary.vegan` | Boolean | default `false` |
| `dietary.halal` | Boolean | default `false` |
| `dietary.kosher` | Boolean | default `false` |
| `dietary.shellfishFree` | Boolean | default `false` |
| `dietary.sesameFree` | Boolean | default `false` |
| `features.dedicatedGfKitchen` | Boolean | default `false` |
| `features.separateFryer` | Boolean | default `false` |
| `features.gfMenu` | Boolean | default `false` |
| `features.gfDesserts` | Boolean | default `false` |
| `features.certifiedGlutenFree` | Boolean | default `false` |
| `features.staffTrainedForCeliac` | Boolean | default `false` |
| `features.crossContaminationPrecautions` | Boolean | default `false` |
| `averageRating` | Number | default `0` |
| `reviewCount` | Number | default `0` |
| `createdAt` | Date | auto (via `timestamps`) |
| `updatedAt` | Date | auto (via `timestamps`) |

## API endpoints

All routes are mounted under `/api`.

### Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/users/me` | required | Returns the DB `User` doc for the current Clerk session. Lazy-creates the row on the first hit via `getOrCreateUser` (snapshot email + name from Clerk). Responds `401` without a valid session. |

### Restaurants

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/restaurants` | List restaurants. See query params below. |
| `GET` | `/api/restaurants/:id` | Fetch one restaurant by id. |
| `POST` | `/api/restaurants` | Create a restaurant. Body validated (required: `name`). Returns `201` + created doc. |
| `PUT` | `/api/restaurants/:id` | Update a restaurant. Body validated. Returns updated doc. |
| `DELETE` | `/api/restaurants/:id` | Delete a restaurant. Returns `204`. |

**`GET /api/restaurants` query params** — all optional, all combinable (AND):

| Param | Type | Behavior |
| --- | --- | --- |
| `name` | string | Case-insensitive partial match on `name`. |
| `city` | string | Case-insensitive partial match on `address.city`. |
| `state` | string | Exact match on `address.state`. |
| `zip` | string | Exact match on `address.zip`. |
| `restaurantType` | csv | Comma-separated list of types. Matches ANY (`$in`). Example: `?restaurantType=bakery,coffee_shop`. |
| `dietary` | csv | Comma-separated dietary flags. EVERY listed flag must be `true`. Example: `?dietary=glutenFree,vegan`. |
| `features` | csv | Comma-separated feature flags. EVERY listed flag must be `true`. Example: `?features=dedicatedGfKitchen,separateFryer`. |
| `lat`, `lng` | number | Center point for the geo filter. Longitude / latitude in decimal degrees. Both required together — passing one without the other, or a non-numeric value, returns `400`. |
| `radius` | number | Search radius in km for the geo filter. Defaults to `25` when `lat` / `lng` are supplied without it. Uses `$geoWithin` + `$centerSphere` against the 2dsphere-indexed `location` field. |

## Environment variables

**Backend** — defined in `backend/.env` (real values, git-ignored) and documented in `backend/.env.example`:

- `PORT` — HTTP port the API listens on (defaults to `5000`)
- `MONGODB_URI` — MongoDB connection string

**Frontend** — defined in `frontend/.env.local` (real values, git-ignored by Next.js) and documented in `frontend/.env.example`:

- `NEXT_PUBLIC_API_URL` — Base URL of the backend API, ending in `/api` (defaults to `http://localhost:8000/api` in `src/lib/api.js` if unset). Any `NEXT_PUBLIC_*` var is inlined into the client bundle at build time.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (starts with `pk_test_…` / `pk_live_…`). Get it from [dashboard.clerk.com](https://dashboard.clerk.com) → your app → API Keys. The app will not boot without it.
- `CLERK_SECRET_KEY` — Clerk secret key (starts with `sk_test_…` / `sk_live_…`). Server-side only — used by `clerkMiddleware`. Not inlined into the client bundle. The backend will also need this env var once we wire API-side auth.

## Auth strategy

Auth is handled by [Clerk](https://clerk.com/) on the frontend via `@clerk/nextjs` (Core 3 API).

- **Provider**: `<ClerkProvider>` wraps the app in `src/app/layout.js`, giving every route access to Clerk's context (`useUser`, `useAuth`, and the auth-aware UI components).
- **Route protection**: `frontend/middleware.js` uses `clerkMiddleware` + `createRouteMatcher` to gate write-side and personal routes. Currently protects `/profile(.*)`, `/favorites(.*)`, `/forum/new(.*)` (posting), and `/forum/(.*)/comment(.*)` (commenting). Browse-only routes (`/`, `/restaurants`, `/restaurants/[id]`, and future `/forum`, `/forum/[id]` reads) stay public. Signed-out users hitting a protected route are redirected to Clerk's sign-in flow, then bounced back.
- **Header**: `src/components/Header.js` uses `<Show when="signed-out">` around `<SignInButton mode="modal">` (opens Clerk's sign-in modal in place) and `<Show when="signed-in">` around `<UserButton>` (avatar + menu with a Sign out link). Sign-out returns the user to `/`.
- **Profile**: `src/app/profile/page.js` is a client component using `useUser()` to render the signed-in user's name and email. Middleware ensures the user is authenticated before the page loads.
- **Backend**: Uses `@clerk/express`. `server.js` registers `clerkMiddleware()` globally when both `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` are set — this populates `req.auth` on every request from a session cookie or `Authorization: Bearer <token>` (without rejecting). Per-route protection lives in `backend/middleware/requireAuth.js`, which calls `getAuth(req)`, checks `userId`, and responds `401` (matching our error-envelope format) if the request isn't authenticated. Registration is skipped with a console warning when keys are missing so the public routes still work during setup — protected routes just 401 until the keys are pasted in.
- **User lazy-creation**: `backend/utils/getOrCreateUser.js` maps Clerk's `userId` to a row in our `users` collection. Fast path is `findOne({ clerkUserId })`; on first sight, it fetches the Clerk user via `clerkClient.users.getUser`, snapshots the primary email + name, and upserts with `$setOnInsert` so two concurrent first-requests don't race into a duplicate-key error.

## Progress log

- **Class 3** — Monorepo scaffolded: created `frontend/` (Next.js, App Router, JavaScript, Tailwind CSS, ESLint, `src/` directory) and empty `backend/` folder; added root `README.md` and `PROJECT_OVERVIEW.md`. ✅ Done
- **Class 3** — Homepage shell built with placeholder data: `Header`, `Footer`, `RestaurantCard`, and `ForumRow` components in `src/components/`; homepage (`src/app/page.js`) composes them with a hero section, featured restaurants, popular search pills, and recent forum discussions, all styled with Tailwind. ✅ Done
- **Class 4** — Backend shell scaffolded: Node.js + Express (ES modules) with the folder structure above, `config/db.js` MongoDB connector, aggregated router in `routes/index.js` (mounted at `/api`, exposes `GET /api/health`), centralized `middleware/errorHandler.js`, permissive CORS + JSON body parsing, `.env` / `.env.example` (`PORT`, `MONGODB_URI`), and installed `express`, `mongoose`, `dotenv`, `cors`. No resources scaffolded yet. ✅ Done
- **Class 4** — Restaurant resource built end-to-end: `models/restaurant.model.js` (schema with address, GeoJSON `location` + `2dsphere` index, dietary flags, features, ratings), `controllers/restaurant.controller.js` (async CRUD with try/catch → `next(err)`, `name`/`city` case-insensitive partial + `state`/`zip` exact query filters), `validators/restaurant.validator.js` (hand-rolled create/update middleware), `routes/restaurant.routes.js` (mounted at `/restaurants` from `routes/index.js` → full paths under `/api/restaurants`). Added `utils/seed.js` that wipes the collection and inserts 19 realistic sample restaurants across Austin, Portland, Denver, Chicago, NYC, and SF with varied dietary/features/type data. Verified: server boots, seed runs, `GET /api/restaurants` returns 19, `?city=austin` returns 4, full CRUD path returns correct status codes (201/200/204/400/404). ✅ Done
- **Class 4** — Frontend ↔ backend wired up: added `src/lib/api.js` (centralized fetch client with `getRestaurants` / `getRestaurantById`, base URL from `NEXT_PUBLIC_API_URL`, throws on non-2xx). Created `frontend/.env.local` + `frontend/.env.example` with `NEXT_PUBLIC_API_URL`. Built `src/app/restaurants/page.js` — a client-side listing page that reads `name` / `city` / `state` / `zip` from the URL, fetches from the API on mount, and renders loading / empty / error / results states as a responsive grid of `RestaurantCard`s. Added a 4-field search form that pushes filters into the URL query string (which triggers a refetch via component-key remount). Updated `RestaurantCard` to accept a `restaurant` prop matching the backend shape (name, address, imageUrl, features) and render city/state + feature tags; updated homepage placeholder data accordingly. ✅ Done
- **Class 4** — Restaurant detail page + navigation wiring. Added `src/app/restaurants/[id]/page.js` (server component) that fetches via `getRestaurantById(id)` and renders the full restaurant: hero image, name, city/state, rating, About, Celiac-Safety Features, Dietary Options, Contact (phone, website), Address (with Google Maps link built from `location.coordinates` when available). Added `src/app/restaurants/[id]/not-found.js` for the friendly 404 UI; enhanced `api.js` to attach `err.status` so the page can distinguish 400/404 from other failures and call `notFound()`. Wired the header's Restaurants link, the homepage hero search (plain GET form → `/restaurants?name=…`), the Popular Searches pills (`<Link>`s to `/restaurants?name=…`), and `RestaurantCard` (whole card is a `<Link>` to `/restaurants/[id]`). ✅ Done
- **Class 4** — Extended `GET /api/restaurants` with advanced filters. Added `restaurantType` (comma-separated, match ANY via `$in`), `dietary` and `features` (comma-separated, EVERY flag must be true — implemented by adding one `dietary.<flag>: true` / `features.<flag>: true` condition per token), and geospatial `lat` / `lng` / `radius` (defaults to 25 km, uses `$geoWithin` + `$centerSphere` on the 2dsphere-indexed `location` field). Filter object is built up step-by-step so any combination composes with AND semantics. Invalid or partial lat/lng returns `400`. Verified: `?dietary=glutenFree,vegan` → 8; `?features=dedicatedGfKitchen,separateFryer` → 3; `?lat=30.27&lng=-97.74&radius=10` → 4 Austin restaurants. ✅ Done
- **Class 4** — Filter panel on `/restaurants`. Added a sticky sidebar (desktop) / slide-out drawer (mobile, via a "Filters" button) with three checkbox-group sections — Dietary (13 flags), Restaurant Features (7 flags), Restaurant Type (8 flags). Each checkbox toggles its category's csv URL query param, which the listing refetches on. **Gluten Free** defaults to checked when the URL has no `dietary` key, is rendered with an emerald "Core" badge and highlighted row, and is excluded from the active-filter count. Explicit `?dietary=` in the URL is respected as "user opted out of GF". "Clear all" resets everything to just `?dietary=glutenFree`. Active-filter count is displayed near the top. `src/lib/api.js` was updated to accept arrays for query-param values and auto-join them into csv strings. Escape key closes the mobile drawer. ✅ Done
- **Class 4** — Geolocation + nearby search. Extracted the homepage's "Find Restaurants Near You" button into `src/components/NearbyButton.js` (client component). Click asks the browser for `navigator.geolocation`, navigates to `/restaurants?lat=&lng=&radius=25` on grant, and shows a friendly inline fallback (with a "Search by city" link) on denial, timeout, or an unsupported browser. Extended `/restaurants` to read `lat`/`lng`/`radius` from the URL and forward them to the API — this also fixed a latent bug where hand-crafted geo URLs were ignored. When both `lat` and `lng` are present, a small banner renders above the search bar: "📍 Showing restaurants within **N** km of your location — Change", where **N** comes from the URL's `radius` (defaulting to 25). "Change" clears just `lat`/`lng`/`radius` from the URL while leaving every other filter intact. Added 3 seed restaurants in the Plainsboro / Princeton, NJ area (Millstone Bakery, Nassau Street Kitchen, Ridge Road Cafe) so a local geolocation returns results. ✅ Done
- **Class 7** — Clerk auth on the frontend. Installed `@clerk/nextjs` v7 (Core 3). Wrapped `<html>` in `<ClerkProvider>` inside `src/app/layout.js`. Added `frontend/middleware.js` using `clerkMiddleware` + `createRouteMatcher` to protect `/profile`, `/favorites`, and write-side forum routes (`/forum/new`, `/forum/<id>/comment`) while keeping browse routes public. Updated `Header` to swap between `<SignInButton mode="modal">` (opens Clerk's sign-in modal) and `<UserButton>` (avatar menu) via `<Show when="signed-out">` / `<Show when="signed-in">` — the Core 3 replacement for the removed `<SignedIn>` / `<SignedOut>` components. Added `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to `frontend/.env.local` (empty) and `frontend/.env.example`. Created `src/app/profile/page.js` — a client component using `useUser()` to display the signed-in user's name and email; middleware guarantees the user is authenticated by the time the page renders. ✅ Done
- **Class 7** — Clerk verification on the backend. Installed `@clerk/express`. Added `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to `backend/.env` and `.env.example` (both required by `clerkMiddleware()`). `server.js` conditionally registers `clerkMiddleware()` when both keys are present — public routes stay reachable during setup. Added `backend/middleware/requireAuth.js` — reads `getAuth(req)`, attaches `req.auth`, and returns 401 with our standard error envelope on missing session (also swallows the `getAuth`-without-middleware throw). Added `models/user.model.js` (clerkUserId unique+indexed, email, name, favorites → Restaurant refs, timestamps). Added `utils/getOrCreateUser.js` — lazy-creates the DB user on first authed request via `clerkClient.users.getUser` + `$setOnInsert` upsert (race-safe). Added `controllers/user.controller.js` (`getMe`) and `routes/user.routes.js` (`GET /me` → requireAuth → getMe), mounted at `/api/users`. Verified: `GET /api/users/me` returns 401 without a session; public routes (`/api/health`, `/api/restaurants`) still 200. Positive-path verification (200 + user doc from a real session) requires the user's Clerk keys pasted into `backend/.env`. ✅ Done

## Known issues / open items

_None yet._
