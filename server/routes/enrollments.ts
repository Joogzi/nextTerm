import { db } from "../db";

// --- Student Enrollments ---

export function getStudentCourses(studentId: number): Response {
  const rows = db
    .query(
      `SELECT sc.id as enrollment_id, sc.enrolled_at, sc.section_id,
              c.id as course_id, c.name as course_name, c.department, c.description,
              c.subject, c.catalog_number,
              p.id as professor_id, p.name as professor_name,
              sem.season, sem.year,
              s.section_number, s.component, s.instruction_mode,
              s.meeting_days, s.start_time, s.end_time
      FROM student_courses sc
      JOIN sections s ON sc.section_id = s.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN professors p ON s.professor_id = p.id
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE sc.student_id = ?
      ORDER BY sem.year DESC, sem.season DESC`,
    )
    .all(studentId);
  return json(rows);
}

export function enrollStudent(studentId: number, body: { section_id: number }): Response {
  // Check section exists
  const section = db.query("SELECT id FROM sections WHERE id = ?").get(body.section_id);
  if (!section) return json({ error: "Section not found" }, 404);

  // Check not already enrolled
  const existing = db
    .query("SELECT id FROM student_courses WHERE student_id = ? AND section_id = ?")
    .get(studentId, body.section_id);
  if (existing) return json({ error: "Already enrolled in this section" }, 409);

  const stmt = db.query(
    "INSERT INTO student_courses (student_id, section_id) VALUES (?, ?) RETURNING *",
  );
  const enrollment = stmt.get(studentId, body.section_id);
  return json(enrollment, 201);
}

export function unenrollStudent(studentId: number, sectionId: number): Response {
  const existing = db
    .query("SELECT id FROM student_courses WHERE student_id = ? AND section_id = ?")
    .get(studentId, sectionId);
  if (!existing) return json({ error: "Not enrolled in this section" }, 404);

  db.query("DELETE FROM student_courses WHERE student_id = ? AND section_id = ?").run(
    studentId,
    sectionId,
  );
  return json({ success: true });
}

// Get courses a professor teaches
export function getProfessorCourses(professorId: number): Response {
  const rows = db
    .query(
      `SELECT s.id as section_id,
              c.id as course_id, c.name as course_name, c.department, c.description,
              sem.season, sem.year,
              COUNT(sc.id) as enrolled_students
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      JOIN semesters sem ON s.semester_id = sem.id
      LEFT JOIN student_courses sc ON sc.section_id = s.id
      WHERE s.professor_id = ?
      GROUP BY s.id
      ORDER BY sem.year DESC, sem.season DESC`,
    )
    .all(professorId);
  return json(rows);
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
