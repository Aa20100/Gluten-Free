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
- TBD

**Database**
- TBD

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
- `src/lib/` — Reserved for shared utilities, API client helpers, and constants as the app grows. Empty for now.

## Backend folder structure and conventions

TBD - to be scaffolded

## Data models

_None yet._

## API endpoints

_None yet._

## Environment variables

_None yet._

## Auth strategy

Auth will be handled with [Clerk](https://clerk.com/). This is planned for a later step (Class 7) and is not yet implemented.

## Progress log

- **Class 3** — Monorepo scaffolded: created `frontend/` (Next.js, App Router, JavaScript, Tailwind CSS, ESLint, `src/` directory) and empty `backend/` folder; added root `README.md` and `PROJECT_OVERVIEW.md`. ✅ Done
- **Class 3** — Homepage shell built with placeholder data: `Header`, `Footer`, `RestaurantCard`, and `ForumRow` components in `src/components/`; homepage (`src/app/page.js`) composes them with a hero section, featured restaurants, popular search pills, and recent forum discussions, all styled with Tailwind. ✅ Done

## Known issues / open items

_None yet._
