import { db } from "../db";

// --- Reviews ---

export function listReviews(url: URL): Response {
  const sectionId = url.searchParams.get("section_id");
  const studentId = url.searchParams.get("student_id");

  let query = `
    SELECT r.*, s.name as student_name,
           c.name as course_name, p.name as professor_name,
           sem.season, sem.year
    FROM reviews r
    JOIN students s ON r.student_id = s.id
    JOIN sections sec ON r.section_id = sec.id
    JOIN courses c ON sec.course_id = c.id
    JOIN professors p ON sec.professor_id = p.id
    JOIN semesters sem ON sec.semester_id = sem.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (sectionId) {
    conditions.push("r.section_id = ?");
    params.push(Number(sectionId));
  }
  if (studentId) {
    conditions.push("r.student_id = ?");
    params.push(Number(studentId));
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY r.created_at DESC";

  const rows = db.query(query).all(...params);
  return json(rows);
}

export function getReview(id: number): Response {
  const review = db
    .query(
      `SELECT r.*, s.name as student_name,
              c.name as course_name, p.name as professor_name,
              sem.season, sem.year
      FROM reviews r
      JOIN students s ON r.student_id = s.id
      JOIN sections sec ON r.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      JOIN professors p ON sec.professor_id = p.id
      JOIN semesters sem ON sec.semester_id = sem.id
      WHERE r.id = ?`,
    )
    .get(id);
  if (!review) return json({ error: "Review not found" }, 404);
  return json(review);
}

export function createReview(body: {
  student_id: number;
  section_id: number;
  overall_rating: number;
  difficulty_rating: number;
  engagement_rating: number;
  clarity_rating: number;
  helpfulness_rating: number;
  workload_rating: number;
  student_grade?: string;
  would_take_again: boolean;
  learning_style_match: number;
  comment?: string;
}): Response {
  const stmt = db.query(
    `INSERT INTO reviews (
      student_id, section_id, overall_rating, difficulty_rating,
      engagement_rating, clarity_rating, helpfulness_rating, workload_rating,
      student_grade, would_take_again, learning_style_match, comment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
  );

  const review = stmt.get(
    body.student_id,
    body.section_id,
    body.overall_rating,
    body.difficulty_rating,
    body.engagement_rating,
    body.clarity_rating,
    body.helpfulness_rating,
    body.workload_rating,
    body.student_grade ?? null,
    body.would_take_again ? 1 : 0,
    body.learning_style_match,
    body.comment ?? null,
  );

  return json(review, 201);
}

export function deleteReview(id: number): Response {
  const existing = db.query("SELECT * FROM reviews WHERE id = ?").get(id);
  if (!existing) return json({ error: "Review not found" }, 404);
  db.query("DELETE FROM reviews WHERE id = ?").run(id);
  return json({ success: true });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
