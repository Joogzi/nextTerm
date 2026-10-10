import { mkdir, writeFile, rename } from 'node:fs/promises';

// Read-only export of display data. Never export account endpoints, tokens or a database file.
const base = new URL(process.env.DEMO_API_URL || 'http://127.0.0.1:8000/api/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
if (base.username || base.password) throw new Error('Do not put credentials in DEMO_API_URL');
if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) {
  throw new Error('Remote backend snapshots require HTTPS');
}

async function get(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Snapshot request ${path} failed (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`Expected an array from ${path}`);
  return data;
}
function pick(row, fields) {
  return Object.fromEntries(fields.map(key => [key, row[key] ?? null]));
}

const [rawCourses, rawSections, rawProfileTags, rawReviewTags] = await Promise.all([
  get('courses'), get('sections'), get('profile/tags'), get('reviews/tags'),
]);
if ((!rawCourses.length || !rawSections.length) && !process.argv.includes('--allow-empty')) {
  throw new Error('The backend has no populated course/section catalog. Existing snapshot left untouched. Import courses or provide DEMO_API_URL first.');
}
const courseFields = ['id','name','subject','catalog_number','department','description','short_description','credits_min','credits_max','tag_names','section_count','avg_rating','review_count'];
const sectionFields = ['id','course_id','professor_id','semester_id','class_number','section_number','component','instruction_mode','enrollment_status','enrollment_total','enrollment_cap','meeting_days','start_time','end_time','building','room','course_name','department','professor_name','season','year'];
const courses = rawCourses.map(c => {
  if (!Number.isInteger(c.id)) throw new Error('Invalid course ID in backend response');
  const course = { ...pick(c, courseFields), personalized_score: c.personalized_score ?? null };
  for (const field of ['name','subject','catalog_number','department','description','short_description']) course[field] = String(c[field] ?? '');
  for (const field of ['credits_min','credits_max','section_count','review_count']) course[field] = Number(c[field] ?? 0);
  return course;
});
const sections = rawSections.map(s => {
  if (!Number.isInteger(s.id)) throw new Error('Invalid section ID in backend response');
  const course = courses.find(c => c.id === s.course_id);
  if (!course) throw new Error(`Section ${s.id} references a course outside the snapshot`);
  const section = { ...pick(s, sectionFields), subject: course.subject, catalog_number: course.catalog_number,
    base_score: course.avg_rating ?? 3, personalized_score: null, professor_personalized_score: null, review_count: 0 };
  for (const field of ['class_number','section_number','component','instruction_mode','enrollment_status','meeting_days','course_name','department','season']) section[field] = String(s[field] ?? '');
  for (const field of ['semester_id','enrollment_total','enrollment_cap','year']) section[field] = Number(s[field] ?? 0);
  return section;
});
const tagFields = ['id','type','name','description'];
const snapshot = {
  version: 1, capturedAt: new Date().toISOString(), courses, sections,
  profileTags: rawProfileTags.map(t => ({ ...pick(t, tagFields), description: t.description ?? '' })),
  reviewTags: rawReviewTags.map(t => ({ ...pick(t, tagFields), type: 'review', description: t.description ?? '' })),
  // Individual students and their reviews are intentionally not exported to a public portfolio.
  // Visitors can create reviews locally; existing aggregate course ratings are preserved above.
  reviews: [],
};
const output = new URL('../src/lib/demo-snapshot.json', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
const temporary = new URL(output.href + '.tmp');
await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
await rename(temporary, output);
console.log(`Captured ${courses.length} courses, ${sections.length} sections, and ${snapshot.profileTags.length} profile tags. No accounts, emails, passwords, or tokens exported.`);
