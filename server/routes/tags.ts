import { db } from "../db";

// --- Tags ---

export function listTags(url: URL): Response {
  const type = url.searchParams.get("type");
  const rows = type
    ? db.query("SELECT * FROM tags WHERE type = ?").all(type)
    : db.query("SELECT * FROM tags").all();
  return json(rows);
}

export function createTag(body: { type: string; name: string; description?: string }): Response {
  const stmt = db.query("INSERT INTO tags (type, name, description) VALUES (?, ?, ?) RETURNING *");
  const tag = stmt.get(body.type, body.name, body.description ?? null);
  return json(tag, 201);
}

export function getTag(id: number): Response {
  const tag = db.query("SELECT * FROM tags WHERE id = ?").get(id);
  if (!tag) return json({ error: "Tag not found" }, 404);
  return json(tag);
}

export function updateTag(id: number, body: { type?: string; name?: string; description?: string }): Response {
  const existing = db.query("SELECT * FROM tags WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!existing) return json({ error: "Tag not found" }, 404);

  db.query("UPDATE tags SET type = ?, name = ?, description = ? WHERE id = ?").run(
    body.type ?? existing.type,
    body.name ?? existing.name,
    body.description ?? existing.description,
    id,
  );

  const updated = db.query("SELECT * FROM tags WHERE id = ?").get(id);
  return json(updated);
}

export function deleteTag(id: number): Response {
  const existing = db.query("SELECT * FROM tags WHERE id = ?").get(id);
  if (!existing) return json({ error: "Tag not found" }, 404);
  db.query("DELETE FROM tags WHERE id = ?").run(id);
  return json({ success: true });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
