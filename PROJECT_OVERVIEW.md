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
| `/restaurants` | `src/app/restaurants/page.js` | Restaurant listing. Client component that reads `name` / `city` / `state` / `zip` from the URL query string, fetches `GET /api/restaurants` via `src/lib/api.js`, and renders results as a grid of `RestaurantCard`s. Includes loading / empty / error states and a 4-field search form; submitting the form updates the URL, which triggers a refetch. |

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

### Restaurants

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/restaurants` | List restaurants. Optional query params: `name`, `city` (case-insensitive partial match); `state`, `zip` (exact match). |
| `GET` | `/api/restaurants/:id` | Fetch one restaurant by id. |
| `POST` | `/api/restaurants` | Create a restaurant. Body validated (required: `name`). Returns `201` + created doc. |
| `PUT` | `/api/restaurants/:id` | Update a restaurant. Body validated. Returns updated doc. |
| `DELETE` | `/api/restaurants/:id` | Delete a restaurant. Returns `204`. |

## Environment variables

**Backend** — defined in `backend/.env` (real values, git-ignored) and documented in `backend/.env.example`:

- `PORT` — HTTP port the API listens on (defaults to `5000`)
- `MONGODB_URI` — MongoDB connection string

**Frontend** — defined in `frontend/.env.local` (real values, git-ignored by Next.js) and documented in `frontend/.env.example`:

- `NEXT_PUBLIC_API_URL` — Base URL of the backend API, ending in `/api` (defaults to `http://localhost:8000/api` in `src/lib/api.js` if unset). Any `NEXT_PUBLIC_*` var is inlined into the client bundle at build time.

## Auth strategy

Auth will be handled with [Clerk](https://clerk.com/). This is planned for a later step (Class 7) and is not yet implemented.

## Progress log

- **Class 3** — Monorepo scaffolded: created `frontend/` (Next.js, App Router, JavaScript, Tailwind CSS, ESLint, `src/` directory) and empty `backend/` folder; added root `README.md` and `PROJECT_OVERVIEW.md`. ✅ Done
- **Class 3** — Homepage shell built with placeholder data: `Header`, `Footer`, `RestaurantCard`, and `ForumRow` components in `src/components/`; homepage (`src/app/page.js`) composes them with a hero section, featured restaurants, popular search pills, and recent forum discussions, all styled with Tailwind. ✅ Done
- **Class 4** — Backend shell scaffolded: Node.js + Express (ES modules) with the folder structure above, `config/db.js` MongoDB connector, aggregated router in `routes/index.js` (mounted at `/api`, exposes `GET /api/health`), centralized `middleware/errorHandler.js`, permissive CORS + JSON body parsing, `.env` / `.env.example` (`PORT`, `MONGODB_URI`), and installed `express`, `mongoose`, `dotenv`, `cors`. No resources scaffolded yet. ✅ Done
- **Class 4** — Restaurant resource built end-to-end: `models/restaurant.model.js` (schema with address, GeoJSON `location` + `2dsphere` index, dietary flags, features, ratings), `controllers/restaurant.controller.js` (async CRUD with try/catch → `next(err)`, `name`/`city` case-insensitive partial + `state`/`zip` exact query filters), `validators/restaurant.validator.js` (hand-rolled create/update middleware), `routes/restaurant.routes.js` (mounted at `/restaurants` from `routes/index.js` → full paths under `/api/restaurants`). Added `utils/seed.js` that wipes the collection and inserts 19 realistic sample restaurants across Austin, Portland, Denver, Chicago, NYC, and SF with varied dietary/features/type data. Verified: server boots, seed runs, `GET /api/restaurants` returns 19, `?city=austin` returns 4, full CRUD path returns correct status codes (201/200/204/400/404). ✅ Done
- **Class 4** — Frontend ↔ backend wired up: added `src/lib/api.js` (centralized fetch client with `getRestaurants` / `getRestaurantById`, base URL from `NEXT_PUBLIC_API_URL`, throws on non-2xx). Created `frontend/.env.local` + `frontend/.env.example` with `NEXT_PUBLIC_API_URL`. Built `src/app/restaurants/page.js` — a client-side listing page that reads `name` / `city` / `state` / `zip` from the URL, fetches from the API on mount, and renders loading / empty / error / results states as a responsive grid of `RestaurantCard`s. Added a 4-field search form that pushes filters into the URL query string (which triggers a refetch via component-key remount). Updated `RestaurantCard` to accept a `restaurant` prop matching the backend shape (name, address, imageUrl, features) and render city/state + feature tags; updated homepage placeholder data accordingly. ✅ Done

## Known issues / open items

_None yet._
