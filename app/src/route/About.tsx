import { isDemo } from "../lib/demo-mode";

export function About(_props: { path?: string }) {
  if (!isDemo) {
    return (
      <div>
        <h1 class="text-3xl font-bold mb-4">About</h1>
        <p class="leading-relaxed text-gray-600">This is the about page.</p>
      </div>
    );
  }

  return (
    <div class="space-y-8 pb-10">
      <section class="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
        <h1 class="text-lg font-semibold text-amber-900">Static Portfolio Demo</h1>
        <p class="mt-1 leading-relaxed text-amber-800">
          This GitHub Pages edition presents the original interface with a captured Autumn 2026
          course catalog. It does not run the Bun/SQLite backend, authenticate real accounts, call
          an AI service, or show live registration availability. Enrollment, profile, and review
          changes are saved only in this browser and are not shared with other visitors. Reviews
          attributed to “Sample Reviewer” are illustrative portfolio content, not real student
          submissions.
        </p>
      </section>

      <section>
        <h2 class="text-3xl font-bold mb-3">About NextTerm</h2>
        <p class="leading-relaxed text-gray-600">
          NextTerm is a course-scheduling concept that brings course discovery, section comparison,
          student preferences, enrollment planning, and instructor reviews into one experience. Our
          team built it for the education challenge at the IBM-sponsored OSU AI Hackathon in
          February 2026, where it won <strong class="font-semibold text-gray-800">2nd Place overall</strong>.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold mb-3">What You Can Explore</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          {[
            "Search the captured catalog by course name, subject, or catalog number.",
            "Compare sections by instructor, schedule, delivery mode, and location.",
            "Build a sample schedule and view enrolled courses on the dashboard.",
            "Select learning preferences and create browser-local course reviews.",
          ].map((feature) => (
            <div key={feature} class="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600">
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold mb-3">Original Architecture</h2>
        <p class="leading-relaxed text-gray-600">
          The full project uses a TypeScript and Preact frontend, a Bun HTTP API, SQLite, JWT-based
          authentication, and an OSU course-data importer. Its preference-aware recommendations use
          deterministic application rules based on course reviews, delivery modes, meeting times,
          and selected student preferences; this demo does not perform live AI inference.
        </p>
        <div class="mt-4 flex flex-wrap gap-2 text-sm">
          {["TypeScript", "Preact", "Tailwind CSS", "Vite", "Bun", "SQLite"].map((technology) => (
            <span key={technology} class="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{technology}</span>
          ))}
        </div>
      </section>

      <section class="border-t border-gray-200 pt-6">
        <p class="text-sm leading-relaxed text-gray-500">
          The complete backend and local setup instructions are available in the{" "}
          <a
            href="https://github.com/Joogzi/nextTerm"
            target="_blank"
            rel="noreferrer"
            class="font-medium text-blue-600 hover:underline"
          >
            NextTerm source repository
          </a>
          .
        </p>
      </section>
    </div>
  );
}
