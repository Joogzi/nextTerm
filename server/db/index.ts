import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "..", "data.db");

const db = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent read performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

export function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      UNIQUE(type, name)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS professors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      osu_course_id TEXT UNIQUE,
      name TEXT NOT NULL,
      short_description TEXT,
      department TEXT NOT NULL,
      subject TEXT,
      catalog_number TEXT,
      description TEXT,
      credits_min REAL,
      credits_max REAL,
      grading TEXT,
      component TEXT,
      academic_career TEXT,
      academic_group TEXT,
      campus TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS course_tags (
      course_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (course_id, tag_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season TEXT NOT NULL,
      year INTEGER NOT NULL,
      term_code TEXT,
      UNIQUE(season, year)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      professor_id INTEGER,
      semester_id INTEGER NOT NULL,
      class_number TEXT,
      section_number TEXT,
      component TEXT,
      instruction_mode TEXT,
      enrollment_status TEXT,
      enrollment_total INTEGER DEFAULT 0,
      enrollment_cap INTEGER DEFAULT 0,
      waitlist_total INTEGER DEFAULT 0,
      waitlist_cap INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      meeting_days TEXT,
      start_time TEXT,
      end_time TEXT,
      building TEXT,
      room TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE SET NULL,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS preference_tags (
      preference_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (preference_id, tag_id),
      FOREIGN KEY (preference_id) REFERENCES preferences(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      overall_rating INTEGER NOT NULL CHECK(overall_rating BETWEEN 1 AND 5),
      difficulty_rating INTEGER NOT NULL CHECK(difficulty_rating BETWEEN 1 AND 5),
      engagement_rating INTEGER NOT NULL CHECK(engagement_rating BETWEEN 1 AND 5),
      clarity_rating INTEGER NOT NULL CHECK(clarity_rating BETWEEN 1 AND 5),
      helpfulness_rating INTEGER NOT NULL CHECK(helpfulness_rating BETWEEN 1 AND 5),
      workload_rating INTEGER NOT NULL CHECK(workload_rating BETWEEN 1 AND 5),
      student_grade TEXT,
      would_take_again INTEGER NOT NULL CHECK(would_take_again IN (0, 1)),
      learning_style_match INTEGER NOT NULL CHECK(learning_style_match BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS student_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, section_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    )
  `);

  console.log("Database initialized");
}

export { db };
