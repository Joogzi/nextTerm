import { db } from "../db";

// --- Preferences ---

export function getPreferences(studentId: number): Response {
  const prefs = db.query("SELECT * FROM preferences WHERE student_id = ?").all(studentId) as Array<{
    id: number;
    student_id: number;
  }>;

  const result = prefs.map((pref) => {
    const tags = db
      .query(
        `SELECT t.* FROM tags t
        JOIN preference_tags pt ON t.id = pt.tag_id
        WHERE pt.preference_id = ?`,
      )
      .all(pref.id);
    return { ...pref, tags };
  });

  return json(result);
}

export function setPreferences(
  studentId: number,
  body: { tag_ids: number[] },
): Response {
  // Delete existing preferences for this student
  const existingPrefs = db.query("SELECT id FROM preferences WHERE student_id = ?").all(studentId) as Array<{
    id: number;
  }>;
  for (const pref of existingPrefs) {
    db.query("DELETE FROM preference_tags WHERE preference_id = ?").run(pref.id);
  }
  db.query("DELETE FROM preferences WHERE student_id = ?").run(studentId);

  // Create new preference
  const stmt = db.query("INSERT INTO preferences (student_id) VALUES (?) RETURNING *");
  const newPref = stmt.get(studentId) as { id: number };

  const insertTag = db.query("INSERT INTO preference_tags (preference_id, tag_id) VALUES (?, ?)");
  for (const tagId of body.tag_ids) {
    insertTag.run(newPref.id, tagId);
  }

  // Return the full preference with tags
  const tags = db
    .query(
      `SELECT t.* FROM tags t
      JOIN preference_tags pt ON t.id = pt.tag_id
      WHERE pt.preference_id = ?`,
    )
    .all(newPref.id);

  return json({ ...newPref, tags });
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
