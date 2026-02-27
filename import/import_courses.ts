/**
 * Import courses and sections from the OSU API into the local database.
 *
 * Two-phase import:
 *   Phase 1: Page through all courses to collect course metadata + courseIds.
 *   Phase 2: For each course, fetch sections via per-course endpoint for full
 *            section + instructor detail.
 *
 * Usage: bun run import_courses.ts [--term 1264] [--pages 5]
 *
 * Options:
 *   --term   OSU term code (default: 1264 = Summer 2026)
 *   --pages  Max catalogue pages to fetch in phase 1 (default: all)
 */

import { join } from "path";

// --- Config ---
const args = process.argv.slice(2);
const termIdx = args.indexOf("--term");
const pagesIdx = args.indexOf("--pages");
const TERM = termIdx !== -1 ? args[termIdx + 1] : "1264";
const MAX_PAGES = pagesIdx !== -1 ? Number(args[pagesIdx + 1]) : Infinity;
const BASE_URL = "https://content.osu.edu/v2/classes/search";
const CAMPUS = "col";
const CAREER = "ugrd";

// --- Database setup (use the server's database module) ---
const { initDatabase, db } = await import("../server/db/index.ts");
initDatabase();

// --- API types ---
interface OSUCourseResponse {
  data: {
    totalItems: number;
    totalPages: number;
    courses: OSUCourseEntry[];
  };
}

interface OSUCourseEntry {
  course: {
    courseId: string;
    title: string;
    shortDescription: string;
    description: string;
    subject: string;
    subjectDesc: string;
    catalogNumber: string;
    maxUnits: number;
    minUnits: number;
    grading: string;
    component: string;
    primaryComponent: string;
    academicGroup: string;
    academicCareer: string;
    campus: string;
    courseAttributes?: Array<{ name: string; value: string; description: string }>;
  };
  sections: OSUSection[];
}

interface OSUSection {
  classNumber: string;
  section: string;
  component: string;
  instructionMode: string;
  courseId: string;
  enrollmentStatus: string;
  enrollmentTotal: number;
  waitlistTotal: number;
  waitlistCapacity: number;
  startDate: string;
  endDate: string;
  meetingDays: string;
  term: string;
  termCode: string;
  attributes?: Array<{ name: string; value: string; description: string }>;
  meetings: Array<{
    startTime: string | null;
    endTime: string | null;
    buildingDescription: string | null;
    room: string | null;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    instructors: Array<{
      displayName: string;
      role: string;
      email: string;
    }>;
  }>;
}

// --- Helper: parse term into season + year ---
function parseTerm(termStr: string): { season: string; year: number } {
  const parts = termStr.split(" ");
  return { season: parts[0], year: Number(parts[1]) };
}

// --- Helper: build meeting days string ---
function buildMeetingDays(meeting: OSUSection["meetings"][0]): string {
  const days: string[] = [];
  if (meeting.monday) days.push("M");
  if (meeting.tuesday) days.push("T");
  if (meeting.wednesday) days.push("W");
  if (meeting.thursday) days.push("R");
  if (meeting.friday) days.push("F");
  if (meeting.saturday) days.push("S");
  if (meeting.sunday) days.push("U");
  return days.join("");
}

// --- Prepared statements ---
const insertCourse = db.query(`
  INSERT OR IGNORE INTO courses (
    osu_course_id, name, short_description, department, subject,
    catalog_number, description, credits_min, credits_max, grading,
    component, academic_career, academic_group, campus
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getCourseByOsuId = db.query("SELECT id FROM courses WHERE osu_course_id = ?");

const insertSemester = db.query(`
  INSERT OR IGNORE INTO semesters (season, year, term_code) VALUES (?, ?, ?)
`);

const getSemester = db.query("SELECT id FROM semesters WHERE season = ? AND year = ?");

const insertProfessor = db.query(`
  INSERT OR IGNORE INTO professors (email, name, password_hash)
  VALUES (?, ?, 'IMPORTED_NO_LOGIN')
`);

const getProfessorByEmail = db.query("SELECT id FROM professors WHERE email = ?");

const insertSection = db.query(`
  INSERT INTO sections (
    course_id, professor_id, semester_id, class_number, section_number,
    component, instruction_mode, enrollment_status, enrollment_total,
    enrollment_cap, waitlist_total, waitlist_cap, start_date, end_date,
    meeting_days, start_time, end_time, building, room
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const checkSectionExists = db.query(
  "SELECT id FROM sections WHERE class_number = ? AND semester_id = ?",
);

const insertTag = db.query(`
  INSERT OR IGNORE INTO tags (type, name, description) VALUES (?, ?, ?)
`);

const getTag = db.query("SELECT id FROM tags WHERE type = ? AND name = ?");

const insertCourseTag = db.query(`
  INSERT OR IGNORE INTO course_tags (course_id, tag_id) VALUES (?, ?)
`);

// --- Phase 1: Fetch catalogue pages to collect courses + courseIds ---

async function fetchCataloguePage(page: number): Promise<OSUCourseResponse> {
  const url = `${BASE_URL}?q=&term=${TERM}&campus=${CAMPUS}&academic-career=${CAREER}&p=${page}`;
  console.log(`  Fetching catalogue page ${page}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return (await res.json()) as OSUCourseResponse;
}

/** Insert course metadata; returns the collected osu_course_id. */
function insertCourseMetadata(entry: OSUCourseEntry): string {
  const c = entry.course;

  insertCourse.run(
    c.courseId,
    c.title,
    c.shortDescription,
    c.subjectDesc,
    c.subject,
    c.catalogNumber,
    c.description,
    c.minUnits,
    c.maxUnits,
    c.grading,
    c.component,
    c.academicCareer,
    c.academicGroup,
    c.campus,
  );

  // Insert course-level attributes as tags
  const courseRow = getCourseByOsuId.get(c.courseId) as { id: number } | null;
  if (courseRow && c.courseAttributes) {
    for (const attr of c.courseAttributes) {
      insertTag.run(attr.name, attr.value, attr.description);
      const tagRow = getTag.get(attr.name, attr.value) as { id: number } | null;
      if (tagRow) {
        insertCourseTag.run(courseRow.id, tagRow.id);
      }
    }
  }

  return c.courseId;
}

// --- Phase 2: Fetch sections per course ---

async function fetchCourseSections(courseId: string): Promise<OSUSection[]> {
  const url = `${BASE_URL}?q=${courseId}&term=${TERM}&campus=${CAMPUS}&academic-career=${CAREER}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching sections for course ${courseId}`);
  const data = (await res.json()) as OSUCourseResponse;

  // Collect all sections from all returned course entries (usually just one)
  const sections: OSUSection[] = [];
  for (const entry of data.data.courses) {
    sections.push(...entry.sections);
  }
  return sections;
}

function processSection(sec: OSUSection, courseId: number) {
  const { season, year } = parseTerm(sec.term);
  insertSemester.run(season, year, sec.termCode);
  const semRow = getSemester.get(season, year) as { id: number } | null;
  if (!semRow) return;

  // Skip if already imported
  const existing = checkSectionExists.get(sec.classNumber, semRow.id);
  if (existing) return;

  // Extract instructor from meetings
  let professorId: number | null = null;
  const meeting = sec.meetings?.[0];
  if (meeting?.instructors?.length) {
    const instructor = meeting.instructors[0];
    if (instructor.email) {
      insertProfessor.run(instructor.email, instructor.displayName);
      const profRow = getProfessorByEmail.get(instructor.email) as { id: number } | null;
      if (profRow) professorId = profRow.id;
    }
  }

  const meetingDays = meeting ? buildMeetingDays(meeting) : "";

  // Section-level attributes → tags linked to course
  if (sec.attributes?.length) {
    for (const attr of sec.attributes) {
      insertTag.run(attr.name, attr.value, attr.description);
      const tagRow = getTag.get(attr.name, attr.value) as { id: number } | null;
      if (tagRow) {
        insertCourseTag.run(courseId, tagRow.id);
      }
    }
  }

  insertSection.run(
    courseId,
    professorId,
    semRow.id,
    sec.classNumber,
    sec.section,
    sec.component,
    sec.instructionMode,
    sec.enrollmentStatus,
    sec.enrollmentTotal,
    0, // enrollment cap not directly exposed
    sec.waitlistTotal,
    sec.waitlistCapacity,
    sec.startDate ?? meeting?.startTime ? sec.startDate : null,
    sec.endDate ?? null,
    meetingDays,
    meeting?.startTime ?? null,
    meeting?.endTime ?? null,
    meeting?.buildingDescription ?? null,
    meeting?.room ?? null,
  );
}

// --- Main ---

async function main() {
  console.log(`\nImporting OSU courses for term ${TERM}...\n`);

  // ── Phase 1: Collect all courseIds ──────────────────────────────────────────
  console.log("Phase 1: Fetching course catalogue...\n");

  const firstPage = await fetchCataloguePage(1);
  const totalPages = Math.min(firstPage.data.totalPages, MAX_PAGES);
  const totalItems = firstPage.data.totalItems;

  console.log(`  Total courses: ${totalItems}`);
  console.log(`  Total pages: ${firstPage.data.totalPages} (fetching ${totalPages})\n`);

  const courseIds = new Set<string>();

  // Process first page
  for (const entry of firstPage.data.courses) {
    courseIds.add(insertCourseMetadata(entry));
  }
  console.log(`  Page 1: ${firstPage.data.courses.length} courses (${courseIds.size} unique so far)`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    try {
      const pageData = await fetchCataloguePage(page);
      for (const entry of pageData.data.courses) {
        courseIds.add(insertCourseMetadata(entry));
      }
      console.log(`  Page ${page}: ${pageData.data.courses.length} courses (${courseIds.size} unique so far)`);
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  Error on page ${page}:`, err);
    }
  }

  console.log(`\n  Phase 1 complete: ${courseIds.size} unique courses collected.\n`);

  // ── Phase 2: Fetch sections per course ─────────────────────────────────────
  console.log("Phase 2: Fetching sections for each course...\n");

  const courseIdList = Array.from(courseIds);
  let sectionsFetched = 0;
  let coursesProcessed = 0;
  let errors = 0;

  for (const osuCourseId of courseIdList) {
    try {
      const courseRow = getCourseByOsuId.get(osuCourseId) as { id: number } | null;
      if (!courseRow) continue;

      const sections = await fetchCourseSections(osuCourseId);
      for (const sec of sections) {
        processSection(sec, courseRow.id);
        sectionsFetched++;
      }

      coursesProcessed++;
      if (coursesProcessed % 50 === 0 || coursesProcessed === courseIdList.length) {
        console.log(
          `  Progress: ${coursesProcessed}/${courseIdList.length} courses, ${sectionsFetched} sections`,
        );
      }

      // Rate-limit: ~100ms between per-course requests
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      errors++;
      console.error(`  Error fetching sections for course ${osuCourseId}:`, err);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const courseCount = (db.query("SELECT COUNT(*) as count FROM courses").get() as { count: number }).count;
  const sectionCount = (db.query("SELECT COUNT(*) as count FROM sections").get() as { count: number }).count;
  const professorCount = (db.query("SELECT COUNT(*) as count FROM professors").get() as { count: number }).count;
  const tagCount = (db.query("SELECT COUNT(*) as count FROM tags").get() as { count: number }).count;

  console.log(`\nImport complete!`);
  console.log(`  Courses: ${courseCount}`);
  console.log(`  Sections: ${sectionCount}`);
  console.log(`  Professors: ${professorCount}`);
  console.log(`  Tags: ${tagCount}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
