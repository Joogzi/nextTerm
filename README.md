# NextTerm

An AI course-scheduling concept built to help students explore courses, compare sections, and plan around their learning preferences.

[Open the portfolio demo](https://joogzi.github.io/nextTerm/)

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

The live site uses GitHub Pages' branch deployment from `main` at the site repository's root. Copy the generated `site/nextTerm/` and `site/dataio2026/` folders to that root when updating it. See the [site repository](https://github.com/Joogzi/joogzi.github.io) for the current deployment instructions.

The public demo contains no Bun server, SQLite database, authentication secrets, or AI integration. The original screen layout and styles are preserved.
