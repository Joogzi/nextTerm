import { db } from "../db";

// --- Sections ---

export function listSections(url: URL): Response {
  const courseId = url.searchParams.get("course_id");
  const professorId = url.searchParams.get("professor_id");
  const semesterId = url.searchParams.get("semester_id");

  let query = `
    SELECT s.*, c.name as course_name, c.department,
           p.name as professor_name, sem.season, sem.year
    FROM sections s
    JOIN courses c ON s.course_id = c.id
    JOIN professors p ON s.professor_id = p.id
    JOIN semesters sem ON s.semester_id = sem.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (courseId) {
    conditions.push("s.course_id = ?");
    params.push(Number(courseId));
  }
  if (professorId) {
    conditions.push("s.professor_id = ?");
    params.push(Number(professorId));
  }
  if (semesterId) {
    conditions.push("s.semester_id = ?");
    params.push(Number(semesterId));
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  const rows = db.query(query).all(...params);
  return json(rows);
}

export function getSection(id: number): Response {
  const section = db
    .query(
      `SELECT s.*, c.name as course_name, c.department,
              p.name as professor_name, sem.season, sem.year
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      JOIN professors p ON s.professor_id = p.id
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.id = ?`,
    )
    .get(id);
  if (!section) return json({ error: "Section not found" }, 404);
  return json(section);
}

export function createSection(body: {
  course_id: number;
  professor_id: number;
  semester_id: number;
}): Response {
  const stmt = db.query(
    "INSERT INTO sections (course_id, professor_id, semester_id) VALUES (?, ?, ?) RETURNING *",
  );
  const section = stmt.get(body.course_id, body.professor_id, body.semester_id);
  return json(section, 201);
}

export function deleteSection(id: number): Response {
  const existing = db.query("SELECT * FROM sections WHERE id = ?").get(id);
  if (!existing) return json({ error: "Section not found" }, 404);
  db.query("DELETE FROM sections WHERE id = ?").run(id);
  return json({ success: true });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
