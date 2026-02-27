import { db } from "../db";

// --- Courses ---

export function listCourses(url: URL): Response {
  const department = url.searchParams.get("department");
  const search = url.searchParams.get("q");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  let query = `
    SELECT c.*,
           GROUP_CONCAT(DISTINCT t.name) as tag_names,
           COUNT(DISTINCT sec.id) as section_count,
           ROUND(AVG(r.overall_rating), 1) as avg_rating,
           COUNT(DISTINCT r.id) as review_count
    FROM courses c
    LEFT JOIN course_tags ct ON c.id = ct.course_id
    LEFT JOIN tags t ON ct.tag_id = t.id
    LEFT JOIN sections sec ON sec.course_id = c.id
    LEFT JOIN reviews r ON r.section_id = sec.id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (department) {
    conditions.push("c.department = ?");
    params.push(department);
  }
  if (search) {
    conditions.push("(c.name LIKE ? OR c.description LIKE ? OR c.subject LIKE ? OR c.catalog_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " GROUP BY c.id ORDER BY c.subject, c.catalog_number";

  if (limit) {
    query += ` LIMIT ${Number(limit)}`;
    if (offset) {
      query += ` OFFSET ${Number(offset)}`;
    }
  }

  const rows = db.query(query).all(...params);
  return json(rows);
}

export function getCourse(id: number): Response {
  const course = db
    .query(
      `SELECT c.*, GROUP_CONCAT(t.name) as tag_names
      FROM courses c
      LEFT JOIN course_tags ct ON c.id = ct.course_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id = ?
      GROUP BY c.id`,
    )
    .get(id);
  if (!course) return json({ error: "Course not found" }, 404);
  return json(course);
}

export function createCourse(body: {
  name: string;
  department: string;
  description?: string;
  tag_ids?: number[];
}): Response {
  const stmt = db.query(
    "INSERT INTO courses (name, department, description) VALUES (?, ?, ?) RETURNING *",
  );
  const course = stmt.get(body.name, body.department, body.description ?? null) as { id: number };

  if (body.tag_ids && body.tag_ids.length > 0) {
    const insertTag = db.query("INSERT INTO course_tags (course_id, tag_id) VALUES (?, ?)");
    for (const tagId of body.tag_ids) {
      insertTag.run(course.id, tagId);
    }
  }

  return json(getCourseById(course.id), 201);
}

export function updateCourse(
  id: number,
  body: { name?: string; department?: string; description?: string; tag_ids?: number[] },
): Response {
  const existing = db.query("SELECT * FROM courses WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!existing) return json({ error: "Course not found" }, 404);

  db.query("UPDATE courses SET name = ?, department = ?, description = ? WHERE id = ?").run(
    body.name ?? existing.name,
    body.department ?? existing.department,
    body.description ?? existing.description,
    id,
  );

  if (body.tag_ids !== undefined) {
    db.query("DELETE FROM course_tags WHERE course_id = ?").run(id);
    const insertTag = db.query("INSERT INTO course_tags (course_id, tag_id) VALUES (?, ?)");
    for (const tagId of body.tag_ids) {
      insertTag.run(id, tagId);
    }
  }

  return json(getCourseById(id));
}

export function deleteCourse(id: number): Response {
  const existing = db.query("SELECT * FROM courses WHERE id = ?").get(id);
  if (!existing) return json({ error: "Course not found" }, 404);
  db.query("DELETE FROM courses WHERE id = ?").run(id);
  return json({ success: true });
}

// --- Helpers ---

function getCourseById(id: number): unknown {
  return db
    .query(
      `SELECT c.*, GROUP_CONCAT(t.name) as tag_names
      FROM courses c
      LEFT JOIN course_tags ct ON c.id = ct.course_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE c.id = ?
      GROUP BY c.id`,
    )
    .get(id);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
