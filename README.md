# NextTerm

An AI course-scheduling concept built to help students explore courses, compare sections, and plan around their learning preferences.

## About

NextTerm brings course discovery, enrollment planning, instructor reviews, and student preferences into one interface. This repository is a portfolio fork of our team's hackathon project.

The portfolio version is a **static demonstration**. It uses a snapshot of the project's course API and browser-local interactions. It does not prompt an AI model, call an LLM service, or require an AI API key. The original Bun/SQLite backend remains available for local development.

## Hackathon Context & Awards

Our team built NextTerm at the **IBM-sponsored OSU AI Hackathon in February 2026**, where projects had to address an education-related problem. Our course-scheduling project won **2nd Place overall**.

## Core Features

- Search courses by name, subject, or catalog number.
- Expand courses to compare section times, delivery modes, instructors, and available ratings.
- Add and remove sections from a personal course dashboard.
- Select learning styles, course preferences, and academic interests.
- Explore course reviews and create reviews for enrolled sections.
- Demonstrate the workflow on a static host without running a database or AI service.

## Technical Highlights

- **Course-data integration:** the importer separates catalog discovery from section-detail retrieval, normalizes course/instructor/semester relationships, and avoids duplicate imported records.
- **Preference-aware exploration:** the original backend combines review attributes, delivery modes, and meeting times through deterministic scoring rules. These are application rules, not live model inference.
- **Relational architecture:** SQLite models courses, sections, semesters, enrollments, tags, and reviews, with foreign keys and WAL mode.
- **Static deployment:** a read-only snapshot exporter preserves API response shapes for the existing Preact screens. Hash routing supports refreshable GitHub Pages links; local enrollment, profile, and review changes stay in the visitor's browser.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | TypeScript, Preact, Preact Router, Tailwind CSS 4, Vite 7 |
| Original API | Bun, Bun HTTP server, SQLite (`bun:sqlite`) |
| Local authentication | Bun password hashing, JWT via `jose` |
| Data integration | OSU course API, TypeScript importer |
| Portfolio hosting | Static Vite build, GitHub Pages |

## Local Setup

Use **Node.js 22.12+ (24 recommended)** and **Bun 1.4.3**.

```bash
git clone https://github.com/Joogzi/nextTerm.git
cd nextTerm/app
bun install --frozen-lockfile
bun run dev:demo
```

The demo is served under `/nextTerm/`. No backend or AI credentials are needed to run an existing snapshot. Demo edits are stored under the `nextterm-demo-v1` local-storage key; removing that key resets them. The anonymous demo identity is not a real account. Sign-in in demo mode does not validate or store credentials.

### Capture course data from the backend

The fork does not include the original hackathon database. A useful portfolio build needs a populated catalog snapshot; the deployment check rejects an empty one.

In one terminal, start the original backend:

```bash
cd server
bun install --frozen-lockfile
bun run dev
```

From the repository root, import a bounded catalog sample and capture the API responses:

```bash
bun run import/import_courses.ts --term 1268 --pages 5
cd app
bun run snapshot:demo
bun run check:snapshot
bun run build:demo
```

`1268` selects Autumn 2026. Choose a term supported by the OSU API. The importer requires access to `content.osu.edu`; this data is a dated snapshot, not live registration availability. Increase `--pages` to capture more catalog pages.

To capture a different running NextTerm API:

```bash
DEMO_API_URL=https://your-backend.example/api/ bun run snapshot:demo
```

The exporter reads courses, sections, profile tags, and review tags. It excludes accounts, credentials, individual students, and individual student reviews. Existing aggregate course ratings are retained; missing ratings remain empty. Snapshot recommendations are fixed values or absent, with no AI requests. Visitors can create reviews locally without publishing them.

### Run the original full-stack application

Start `server` as above, then run `bun run dev` in `app`. Vite proxies `/api` to port 8000. SQLite creates `server/data.db` automatically; it is ignored by Git. Set a private `JWT_SECRET` for any real hosted backend. The local development default is only for local use.

### Validate

```bash
cd app
bun run test:demo
bun run build:demo
```

## GitHub Pages

The requested portfolio path is `/nextTerm/`. The build helper and deployment template in [`deploy/portfolio-pages`](deploy/portfolio-pages/README.md) assemble this app and the Data I/O visualizer into a shared `Joogzi.github.io` site, keeping the two source forks separate. The build helper refuses an empty NextTerm catalog and prepares only the static website files for publication.

The public demo contains no Bun server, SQLite database, authentication secrets, or AI integration. The original screen layout and styles are preserved.
