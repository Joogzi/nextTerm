import { db } from "../db";

// --- Students ---

export function listStudents(): Response {
  const rows = db.query("SELECT id, email, name, created_at FROM students").all();
  return json(rows);
}

export function getStudent(id: number): Response {
  const student = db.query("SELECT id, email, name, created_at FROM students WHERE id = ?").get(id);
  if (!student) return json({ error: "Student not found" }, 404);
  return json(student);
}

export function createStudent(body: { email: string; name: string; password_hash: string }): Response {
  const stmt = db.query(
    "INSERT INTO students (email, name, password_hash) VALUES (?, ?, ?) RETURNING id, email, name, created_at",
  );
  const student = stmt.get(body.email, body.name, body.password_hash);
  return json(student, 201);
}

export function updateStudent(id: number, body: { email?: string; name?: string }): Response {
  const existing = db.query("SELECT * FROM students WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!existing) return json({ error: "Student not found" }, 404);

  db.query("UPDATE students SET email = ?, name = ? WHERE id = ?").run(
    body.email ?? existing.email,
    body.name ?? existing.name,
    id,
  );

  const updated = db.query("SELECT id, email, name, created_at FROM students WHERE id = ?").get(id);
  return json(updated);
}

export function deleteStudent(id: number): Response {
  const existing = db.query("SELECT * FROM students WHERE id = ?").get(id);
  if (!existing) return json({ error: "Student not found" }, 404);
  db.query("DELETE FROM students WHERE id = ?").run(id);
  return json({ success: true });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
