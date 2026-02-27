import { db } from "../db";

// --- Professors ---

export function listProfessors(): Response {
  const rows = db.query("SELECT id, email, name, created_at FROM professors").all();
  return json(rows);
}

export function getProfessor(id: number): Response {
  const professor = db.query("SELECT id, email, name, created_at FROM professors WHERE id = ?").get(id);
  if (!professor) return json({ error: "Professor not found" }, 404);
  return json(professor);
}

export function createProfessor(body: { email: string; name: string; password_hash: string }): Response {
  const stmt = db.query(
    "INSERT INTO professors (email, name, password_hash) VALUES (?, ?, ?) RETURNING id, email, name, created_at",
  );
  const professor = stmt.get(body.email, body.name, body.password_hash);
  return json(professor, 201);
}

export function updateProfessor(id: number, body: { email?: string; name?: string }): Response {
  const existing = db.query("SELECT * FROM professors WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!existing) return json({ error: "Professor not found" }, 404);

  db.query("UPDATE professors SET email = ?, name = ? WHERE id = ?").run(
    body.email ?? existing.email,
    body.name ?? existing.name,
    id,
  );

  const updated = db.query("SELECT id, email, name, created_at FROM professors WHERE id = ?").get(id);
  return json(updated);
}

export function deleteProfessor(id: number): Response {
  const existing = db.query("SELECT * FROM professors WHERE id = ?").get(id);
  if (!existing) return json({ error: "Professor not found" }, 404);
  db.query("DELETE FROM professors WHERE id = ?").run(id);
  return json({ success: true });
}

export function getProfessorInsights(id: number): Response {
  const professor = db.query("SELECT id, name FROM professors WHERE id = ?").get(id);
  if (!professor) return json({ error: "Professor not found" }, 404);

  const avgRatings = db
    .query(
      `SELECT
        AVG(r.overall_rating) as avg_overall,
        AVG(r.difficulty_rating) as avg_difficulty,
        AVG(r.engagement_rating) as avg_engagement,
        AVG(r.clarity_rating) as avg_clarity,
        AVG(r.helpfulness_rating) as avg_helpfulness,
        AVG(r.workload_rating) as avg_workload,
        AVG(r.learning_style_match) as avg_learning_style_match,
        COUNT(r.id) as total_reviews,
        SUM(r.would_take_again) as would_take_again_count
      FROM reviews r
      JOIN sections s ON r.section_id = s.id
      WHERE s.professor_id = ?`,
    )
    .get(id);

  const recentReviews = db
    .query(
      `SELECT r.*, c.name as course_name, sem.season, sem.year
      FROM reviews r
      JOIN sections s ON r.section_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.professor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10`,
    )
    .all(id);

  return json({ professor, ratings: avgRatings, recentReviews });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
