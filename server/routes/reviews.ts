import { db } from "../db";

// --- Reviews ---

export function listReviews(url: URL): Response {
  const sectionId = url.searchParams.get("section_id");
  const courseId = url.searchParams.get("course_id");
  const studentId = url.searchParams.get("student_id");
  const professorId = url.searchParams.get("professor_id");

  let query = `
    SELECT r.*, s.name as student_name,
           c.id as course_id, c.name as course_name,
           c.subject, c.catalog_number,
           p.name as professor_name,
           sem.season, sem.year,
           sec.section_number, sec.component,
           GROUP_CONCAT(DISTINCT t.name) as tag_names
    FROM reviews r
    JOIN students s ON r.student_id = s.id
    JOIN sections sec ON r.section_id = sec.id
    JOIN courses c ON sec.course_id = c.id
    LEFT JOIN professors p ON sec.professor_id = p.id
    JOIN semesters sem ON sec.semester_id = sem.id
    LEFT JOIN review_tags rt ON r.id = rt.review_id
    LEFT JOIN tags t ON rt.tag_id = t.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (sectionId) {
    conditions.push("r.section_id = ?");
    params.push(Number(sectionId));
  }
  if (courseId) {
    conditions.push("sec.course_id = ?");
    params.push(Number(courseId));
  }
  if (studentId) {
    conditions.push("r.student_id = ?");
    params.push(Number(studentId));
  }
  if (professorId) {
    conditions.push("sec.professor_id = ?");
    params.push(Number(professorId));
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " GROUP BY r.id ORDER BY r.created_at DESC";

  const rows = db.query(query).all(...params);
  return json(rows);
}

export function getReview(id: number): Response {
  const review = db
    .query(
      `SELECT r.*, s.name as student_name,
              c.id as course_id, c.name as course_name,
              c.subject, c.catalog_number,
              p.name as professor_name,
              sem.season, sem.year
      FROM reviews r
      JOIN students s ON r.student_id = s.id
      JOIN sections sec ON r.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      LEFT JOIN professors p ON sec.professor_id = p.id
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
  tag_ids?: number[];
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
  ) as { id: number };

  // Insert review tags
  if (body.tag_ids && body.tag_ids.length > 0) {
    const insertTag = db.query("INSERT OR IGNORE INTO review_tags (review_id, tag_id) VALUES (?, ?)");
    for (const tagId of body.tag_ids) {
      insertTag.run(review.id, tagId);
    }
  }

  return json(review, 201);
}

// List review tags (type = 'review')
export function listReviewTags(): Response {
  const tags = db.query("SELECT id, name, description FROM tags WHERE type = 'review' ORDER BY name").all();
  return json(tags);
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
