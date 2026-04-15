# Mini Campaign Manager

A full-stack MarTech tool for creating, managing, and tracking email campaigns.

## Quick Start

```sh
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
yarn install

# 3. Copy env (or use defaults)
cp .env.example packages/api/.env

# 4. Start both API and frontend
yarn dev

# 5. (Optional) Seed demo data
yarn seed
```

- **API**: http://localhost:4000
- **Frontend**: http://localhost:5173
- **Demo login**: `demo@example.com` / `password123` (after seeding)

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Express, Sequelize, PostgreSQL, Zod, JWT |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Data fetching** | React Query (@tanstack/react-query) |
| **State** | Zustand (auth persistence) |
| **Monorepo** | Yarn Workspaces |
| **Tests** | Vitest + Supertest |

## Project Structure

```
packages/
├── api/                    Express backend
│   ├── src/
│   │   ├── app.ts          Entry point, routes, middleware
│   │   ├── config.ts       Environment config
│   │   ├── database.ts     Sequelize instance + migration runner
│   │   ├── models/         Sequelize models (User, Campaign, Recipient, CampaignRecipient)
│   │   ├── middleware/      Auth (JWT), validation (Zod), error handler
│   │   ├── routes/         auth, campaigns, recipients
│   │   ├── validators/     Zod schemas
│   │   ├── migrations/     SQL migration files
│   │   └── seed.ts         Demo data seeder
│   └── tests/              Vitest integration tests
└── web/                    React frontend
    └── src/
        ├── api/            Axios client, React Query hooks, types
        ├── store/          Zustand auth store
        ├── components/     StatusBadge, StatsBar, Layout, ProtectedRoute
        └── pages/          Login, Campaigns, NewCampaign, CampaignDetail
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Register user |
| POST | `/api/v1/auth/login` | No | Login, returns JWT |
| GET | `/api/v1/campaigns` | Yes | List campaigns (paginated) |
| POST | `/api/v1/campaigns` | Yes | Create draft campaign |
| GET | `/api/v1/campaigns/:id` | Yes | Campaign detail + stats + recipients |
| PATCH | `/api/v1/campaigns/:id` | Yes | Update (draft only) |
| DELETE | `/api/v1/campaigns/:id` | Yes | Delete (draft only) |
| POST | `/api/v1/campaigns/:id/schedule` | Yes | Schedule (future date) |
| POST | `/api/v1/campaigns/:id/send` | Yes | Simulate async sending |
| GET | `/api/v1/recipients` | Yes | List all recipients |
| POST | `/api/v1/recipients` | Yes | Create a recipient |

## Business Rules

- Campaigns can only be edited/deleted when status is `draft`
- `scheduled_at` must be a future timestamp
- Sending returns `202 Accepted` immediately, processes recipients asynchronously
- Each recipient has ~80% chance of `sent`, ~20% `failed`, ~30% of sent get `opened`
- Once sent, a campaign cannot be modified or re-sent

## Database Schema

```
users                campaigns              recipients     campaign_recipients
─────                ─────────              ──────────     ───────────────────
id (PK)              id (PK)                id (PK)        campaign_id (FK, PK)
email (UNIQUE)       name                   email (UNIQUE) recipient_id (FK, PK)
name                 subject                name           sent_at
password_hash        body                   created_at     opened_at
created_at           status (enum)                         status (enum)
                     scheduled_at
                     created_by (FK→users)
                     created_at, updated_at
```

**Indexes:**
- `campaigns.created_by` — filter campaigns by owner
- `campaigns.status` — filter list by status
- `campaign_recipients.campaign_id` — stats aggregation
- `campaign_recipients.status` — counting sent/failed/pending

## Tests

```sh
yarn test
```

3 test suites covering:
1. **Auth** — register, duplicate rejection, login, wrong password
2. **Campaign business rules** — create draft, edit draft, reject editing/deleting sent campaigns, reject past schedule dates
3. **Send simulation** — sends campaign, marks all recipients as sent/failed, campaign status transitions to sent

## How I Used Claude Code

### Development Workflow

I followed a structured AI-assisted workflow inspired by the [Superpowers](https://github.com/obra/superpowers) methodology, adapted for this challenge:

1. **Brainstorming & Planning** — I discussed the architecture with Claude before writing any code: monorepo structure, tech stack tradeoffs, API design conventions. Claude proposed, I challenged and refined. Key decisions (Zustand over Redux, Sequelize model patterns, REST response shapes) were made in this phase.

2. **Phased Implementation** — Rather than generating the entire project at once, I broke work into focused phases: database layer first, then auth, then campaign CRUD, then sending simulation, then frontend. Each phase was reviewed before moving on.

3. **Code Review with `/simplify`** — After the initial implementation, I used Claude Code's `/simplify` skill which launches three parallel review agents (reuse, quality, efficiency). This caught real issues: duplicate error handling patterns, N+1 query in the send simulation, dead code in database config, and missing try/catch on frontend mutations.

4. **Requirements Gap Analysis** — I had Claude deeply compare our implementation against the requirements spec. This caught three gaps: missing `GET /campaigns/:id/stats` as a separate endpoint, `POST /recipient` (singular) alias, and `open_rate`/`send_rate` snake_case mismatch.

5. **Browser-Based E2E Testing** — I used Claude Code's [Chrome MCP integration](https://claude.ai/chrome) (claude-in-chrome) to let Claude directly control a Chrome browser — navigating pages, clicking buttons, taking screenshots, and verifying the full user flow (login → campaign list → detail → send → stats update) visually rather than just trusting unit tests.

### Skills & Tools Used

Beyond vanilla Claude Code, I used several [skills.sh](https://skills.sh/) skills:

- **`/simplify`** — Automated code review across three dimensions (reuse, quality, efficiency) with parallel subagents
- **`rest-api-design`** ([skills.sh/aj-geddes/useful-ai-prompts/rest-api-design](https://skills.sh/aj-geddes/useful-ai-prompts/rest-api-design)) — Referenced for REST conventions: plural nouns, proper status codes, consistent error envelopes, pagination patterns
- **Chrome MCP** — Browser automation for visual E2E testing: Claude navigated the app, clicked through flows, and screenshotted results to verify UI correctness

### Real Prompts Used

1. *"Don't code yet — propose me solution!"*
   Before any implementation, I had Claude present the full architecture plan (project structure, API design, tech decisions, what to skip) for my review. This prevented wasted work on wrong approaches.

2. *"Let deeply review the current implementation with the requirement: [full spec pasted]"*
   After implementation, I pasted the complete requirements back and asked Claude to do a gap analysis. This is where it caught the missing `/stats` endpoint, the singular `/recipient` route, and the snake_case mismatch.

3. *"Remove these kind of comments, why we use var? use better naming, implement debounce for input"*
   Direct, specific code quality feedback. I pointed out concrete issues (decorative comments, `var` instead of `const`, abbreviated names like `fmtRate`) and let Claude fix them systematically.

### Where Claude Code Was Wrong or Needed Correction

- **Node.js compatibility**: Used `import.meta.dirname` (Node 21+) when we were on Node 20 — had to fall back to `fileURLToPath(import.meta.url)`
- **Port conflicts**: Assumed port 5432 was free for Docker PostgreSQL, but a local PostgreSQL was already running — had to remap to 5433
- **PostCSS config format**: Generated ES module syntax (`export default`) in `postcss.config.js` but Vite expected CommonJS (`module.exports`)
- **Stats field naming**: Used `openRate`/`sendRate` (camelCase) when the spec explicitly required `open_rate`/`send_rate` (snake_case) — caught during the requirements gap analysis pass
- **Over-engineering tendency**: Initial proposal for Problem 2 (Fancy Form) used React + Tailwind + Vite for a single form. I pushed back and we rewrote it in vanilla JS — a better fit for the scope

### What I Would NOT Let Claude Code Do

- **Database schema design** — I designed the tables, indexes, and constraints myself. AI tends to miss domain-specific indexing needs (e.g., composite index on `campaign_recipients` for stats queries) or create over-normalized structures
- **Business rule decisions** — The state machine (draft → scheduled → sending → sent), what's irreversible, what requires auth — these were my decisions based on understanding the domain
- **Security review** — I manually verified JWT middleware, bcrypt rounds, input validation, and SQL injection surface rather than trusting generated code blindly. Security bugs are the kind AI hides well behind correct-looking code
- **Architectural tradeoffs** — Choosing Zustand over Redux, Sequelize over raw SQL, Express 4 over 5 — these require understanding the ecosystem and the reviewer's expectations, not just what's technically possible
