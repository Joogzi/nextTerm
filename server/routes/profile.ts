import { db } from "../db";

// --- Student Profile Tags ---

/** Get all available student profile tags (learning_style, preference, interest) */
export function listStudentProfileTags(): Response {
  const tags = db
    .query(
      "SELECT id, type, name, description FROM tags WHERE type IN ('learning_style', 'preference', 'interest') ORDER BY type, name",
    )
    .all();
  return json(tags);
}

/** Get tags for a specific student */
export function getStudentTags(studentId: number): Response {
  const tags = db
    .query(
      `SELECT t.id, t.type, t.name, t.description
       FROM student_tags st
       JOIN tags t ON st.tag_id = t.id
       WHERE st.student_id = ?
       ORDER BY t.type, t.name`,
    )
    .all(studentId);
  return json(tags);
}

/** Set tags for a student (replaces all existing) */
export function setStudentTags(
  studentId: number,
  body: { tag_ids: number[] },
): Response {
  const student = db.query("SELECT id FROM students WHERE id = ?").get(studentId);
  if (!student) return json({ error: "Student not found" }, 404);

  db.query("DELETE FROM student_tags WHERE student_id = ?").run(studentId);

  if (body.tag_ids && body.tag_ids.length > 0) {
    const insert = db.query("INSERT OR IGNORE INTO student_tags (student_id, tag_id) VALUES (?, ?)");
    for (const tagId of body.tag_ids) {
      insert.run(studentId, tagId);
    }
  }

  return getStudentTags(studentId);
}

// --- Alignment mappings ---

const positiveAlignments: Record<string, string[]> = {
  "Engaging Lectures": ["Amazing Lectures", "Inspirational", "Hilarious"],
  "Easy Grader": ["Curved Grading", "Extra Credit"],
  "Light Workload": ["Extra Credit"],
  "Clear Expectations": ["Clear Grading Criteria", "Gives Good Feedback"],
  "Collaborative": ["Group Projects"],
};

const negativeAlignments: Record<string, string[]> = {
  "Easy Grader": ["Tough Grader"],
  "Light Workload": ["Lots of Homework", "So Many Papers", "Get Ready to Read", "Test Heavy"],
  "Independent": ["Group Projects", "Participation Matters"],
  "Collaborative": [],
};

/** Compute a personalized review score given student prefs and review tags */
function computeReviewBonus(
  studentPrefs: Set<string>,
  reviewTagNames: string | null,
  learningStyleMatch: number,
): number {
  let bonus = 0;
  const reviewTags = new Set(reviewTagNames ? reviewTagNames.split(",") : []);

  for (const pref of studentPrefs) {
    const positives = positiveAlignments[pref] || [];
    for (const posTag of positives) {
      if (reviewTags.has(posTag)) bonus += 0.3;
    }
    const negatives = negativeAlignments[pref] || [];
    for (const negTag of negatives) {
      if (reviewTags.has(negTag)) bonus -= 0.3;
    }
  }

  if (learningStyleMatch >= 4) bonus += 0.1;
  if (learningStyleMatch <= 2) bonus -= 0.1;

  return bonus;
}

function computeModeBonus(studentPrefs: Set<string>, instructionMode: string): number {
  if (studentPrefs.has("In Person") && instructionMode === "In Person") return 0.3;
  if (studentPrefs.has("Online") && instructionMode === "Distance Learning") return 0.3;
  if (studentPrefs.has("Hybrid") && instructionMode === "Hybrid Delivery") return 0.3;
  if (studentPrefs.has("In Person") && instructionMode !== "In Person") return -0.2;
  return 0;
}

function computeTimeBonus(studentPrefs: Set<string>, startTime: string | null): number {
  if (!startTime) return 0;
  const hour = parseTimeHour(startTime);
  if (studentPrefs.has("Morning Classes") && hour < 12) return 0.2;
  if (studentPrefs.has("Afternoon Classes") && hour >= 12 && hour < 17) return 0.2;
  if (studentPrefs.has("Evening Classes") && hour >= 17) return 0.2;
  return 0;
}

function getStudentPrefs(studentId: number) {
  const studentTags = db
    .query(
      `SELECT t.id, t.type, t.name FROM student_tags st
       JOIN tags t ON st.tag_id = t.id
       WHERE st.student_id = ?`,
    )
    .all(studentId) as Array<{ id: number; type: string; name: string }>;

  return {
    tags: studentTags,
    prefs: new Set(studentTags.filter((t) => t.type === "preference").map((t) => t.name)),
    hasAny: studentTags.length > 0,
  };
}

// --- Personalized Course Search ---

/**
 * Return the same course-list shape as /api/courses but with
 * personalized_score computed from the student's profile tags.
 */
export function getPersonalizedCourseList(studentId: number, url: URL): Response {
  const search = url.searchParams.get("q");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");

  const { prefs, hasAny } = getStudentPrefs(studentId);

  // 1. Fetch courses (mirrors listCourses)
  let courseQuery = `
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

  if (search) {
    conditions.push(
      "(c.name LIKE ? OR c.description LIKE ? OR c.subject LIKE ? OR c.catalog_number LIKE ?)",
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (conditions.length > 0) courseQuery += " WHERE " + conditions.join(" AND ");
  courseQuery += " GROUP BY c.id ORDER BY c.subject, c.catalog_number";
  if (limit) {
    courseQuery += ` LIMIT ${Number(limit)}`;
    if (offset) courseQuery += ` OFFSET ${Number(offset)}`;
  }

  const courses = db.query(courseQuery).all(...params) as Array<Record<string, unknown>>;

  if (!hasAny || courses.length === 0) {
    return json(courses.map((c) => ({ ...c, personalized_score: null })));
  }

  // 2. Fetch all reviews+tags for these courses in one go
  const courseIds = courses.map((c) => c.id as number);
  const placeholders = courseIds.map(() => "?").join(",");
  const allReviews = db
    .query(
      `SELECT r.overall_rating, r.learning_style_match,
              sec.course_id, sec.instruction_mode, sec.start_time,
              GROUP_CONCAT(DISTINCT tag.name) as review_tag_names
       FROM reviews r
       JOIN sections sec ON r.section_id = sec.id
       LEFT JOIN review_tags rt ON r.id = rt.review_id
       LEFT JOIN tags tag ON rt.tag_id = tag.id
       WHERE sec.course_id IN (${placeholders})
       GROUP BY r.id`,
    )
    .all(...courseIds) as Array<{
    overall_rating: number;
    learning_style_match: number;
    course_id: number;
    instruction_mode: string;
    start_time: string | null;
    review_tag_names: string | null;
  }>;

  // Group by course
  const byCourse: Record<number, typeof allReviews> = {};
  for (const r of allReviews) {
    (byCourse[r.course_id] ??= []).push(r);
  }

  // 3. Compute personalized score per course
  const enriched = courses.map((course) => {
    const reviews = byCourse[course.id as number] || [];
    if (reviews.length === 0) return { ...course, personalized_score: null };

    let total = 0;
    for (const r of reviews) {
      const bonus =
        computeReviewBonus(prefs, r.review_tag_names, r.learning_style_match) +
        computeModeBonus(prefs, r.instruction_mode) +
        computeTimeBonus(prefs, r.start_time);
      total += Math.max(1, Math.min(5, r.overall_rating + bonus));
    }
    const score = Math.round((total / reviews.length) * 10) / 10;
    return { ...course, personalized_score: score };
  });

  // Sort: personalized first (desc), then unscored courses keep original order
  enriched.sort((a, b) => {
    const aS = a.personalized_score as number | null;
    const bS = b.personalized_score as number | null;
    if (aS !== null && bS !== null) return (bS as number) - (aS as number);
    if (aS !== null) return -1;
    if (bS !== null) return 1;
    return 0;
  });

  return json(enriched);
}

// --- Personalized Section + Professor Scores ---

/**
 * For a given course, return sections with per-section personalized score
 * and per-professor personalized score.
 */
export function getPersonalizedScores(studentId: number, courseId?: number): Response {
  const { prefs, hasAny } = getStudentPrefs(studentId);

  // Sections
  let sectionQuery = `
    SELECT sec.id as section_id, sec.course_id, sec.instruction_mode,
           sec.class_number, sec.section_number, sec.meeting_days,
           sec.start_time, sec.end_time, sec.component,
           sec.professor_id,
           c.name as course_name, c.subject, c.catalog_number, c.department,
           p.name as professor_name
    FROM sections sec
    JOIN courses c ON sec.course_id = c.id
    LEFT JOIN professors p ON sec.professor_id = p.id
  `;
  const params: unknown[] = [];
  if (courseId) {
    sectionQuery += " WHERE sec.course_id = ?";
    params.push(courseId);
  }
  sectionQuery += " ORDER BY c.subject, c.catalog_number, sec.section_number";

  const sections = db.query(sectionQuery).all(...params) as Array<{
    section_id: number;
    course_id: number;
    instruction_mode: string;
    class_number: string;
    section_number: string;
    meeting_days: string;
    start_time: string | null;
    end_time: string | null;
    component: string;
    professor_id: number | null;
    course_name: string;
    subject: string;
    catalog_number: string;
    department: string;
    professor_name: string | null;
  }>;

  if (!hasAny) {
    // No student tags — return with null scores
    return json(
      sections.map((sec) => ({
        ...sec,
        base_score: 3,
        personalized_score: null,
        professor_personalized_score: null,
        review_count: 0,
      })),
    );
  }

  // Gather all professor IDs in these sections
  const professorIds = [...new Set(sections.map((s) => s.professor_id).filter(Boolean))] as number[];

  // Pre-compute professor personalized scores (across ALL their reviews, not just this course)
  const profScores: Record<number, number | null> = {};
  if (professorIds.length > 0) {
    const profPlaceholders = professorIds.map(() => "?").join(",");
    const profReviews = db
      .query(
        `SELECT r.overall_rating, r.learning_style_match,
                sec.professor_id, sec.instruction_mode, sec.start_time,
                GROUP_CONCAT(DISTINCT tag.name) as review_tag_names
         FROM reviews r
         JOIN sections sec ON r.section_id = sec.id
         LEFT JOIN review_tags rt ON r.id = rt.review_id
         LEFT JOIN tags tag ON rt.tag_id = tag.id
         WHERE sec.professor_id IN (${profPlaceholders})
         GROUP BY r.id`,
      )
      .all(...professorIds) as Array<{
      overall_rating: number;
      learning_style_match: number;
      professor_id: number;
      instruction_mode: string;
      start_time: string | null;
      review_tag_names: string | null;
    }>;

    const byProf: Record<number, typeof profReviews> = {};
    for (const r of profReviews) {
      (byProf[r.professor_id] ??= []).push(r);
    }

    for (const pid of professorIds) {
      const reviews = byProf[pid] || [];
      if (reviews.length === 0) {
        profScores[pid] = null;
        continue;
      }
      let total = 0;
      for (const r of reviews) {
        const bonus =
          computeReviewBonus(prefs, r.review_tag_names, r.learning_style_match) +
          computeModeBonus(prefs, r.instruction_mode) +
          computeTimeBonus(prefs, r.start_time);
        total += Math.max(1, Math.min(5, r.overall_rating + bonus));
      }
      profScores[pid] = Math.round((total / reviews.length) * 10) / 10;
    }
  }

  // Per-section scores
  const scoredSections = sections.map((sec) => {
    const reviews = db
      .query(
        `SELECT r.overall_rating, r.learning_style_match,
                GROUP_CONCAT(t.name) as tag_names
         FROM reviews r
         LEFT JOIN review_tags rt ON r.id = rt.review_id
         LEFT JOIN tags t ON rt.tag_id = t.id
         WHERE r.section_id = ?
         GROUP BY r.id`,
      )
      .all(sec.section_id) as Array<{
      overall_rating: number;
      learning_style_match: number;
      tag_names: string | null;
    }>;

    const reviewCount = reviews.length;
    let baseScore = reviewCount > 0
      ? reviews.reduce((s, r) => s + r.overall_rating, 0) / reviewCount
      : 3;

    let tagBonus = 0;
    if (reviewCount > 0) {
      for (const r of reviews) {
        tagBonus += computeReviewBonus(prefs, r.tag_names, r.learning_style_match);
      }
      tagBonus /= reviewCount;
    }

    const modeBonus = computeModeBonus(prefs, sec.instruction_mode);
    const timeBonus = computeTimeBonus(prefs, sec.start_time);
    const personalizedScore = Math.max(1, Math.min(5, baseScore + tagBonus + modeBonus + timeBonus));

    return {
      ...sec,
      base_score: Math.round(baseScore * 10) / 10,
      personalized_score: Math.round(personalizedScore * 10) / 10,
      professor_personalized_score: sec.professor_id ? (profScores[sec.professor_id] ?? null) : null,
      review_count: reviewCount,
    };
  });

  scoredSections.sort((a, b) => b.personalized_score - a.personalized_score);
  return json(scoredSections);
}

function parseTimeHour(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!match) return 12;
  let hour = Number(match[1]);
  const ampm = match[3].toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return hour;
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
