import { db } from "../db";

// --- Semesters ---

export function listSemesters(): Response {
  const rows = db.query("SELECT * FROM semesters ORDER BY year DESC, season DESC").all();
  return json(rows);
}

export function getSemester(id: number): Response {
  const semester = db.query("SELECT * FROM semesters WHERE id = ?").get(id);
  if (!semester) return json({ error: "Semester not found" }, 404);
  return json(semester);
}

export function createSemester(body: { season: string; year: number }): Response {
  const stmt = db.query("INSERT INTO semesters (season, year) VALUES (?, ?) RETURNING *");
  const semester = stmt.get(body.season, body.year);
  return json(semester, 201);
}

export function deleteSemester(id: number): Response {
  const existing = db.query("SELECT * FROM semesters WHERE id = ?").get(id);
  if (!existing) return json({ error: "Semester not found" }, 404);
  db.query("DELETE FROM semesters WHERE id = ?").run(id);
  return json({ success: true });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
