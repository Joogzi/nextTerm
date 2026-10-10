import { readFile } from 'node:fs/promises';
const snapshot = JSON.parse(await readFile(new URL('../src/lib/demo-snapshot.json', import.meta.url), 'utf8'));
if (!snapshot.courses.length || !snapshot.sections.length) {
  throw new Error('Portfolio publication needs a populated backend snapshot. Run npm run snapshot:demo against a populated NextTerm API first.');
}
console.log(`Portfolio snapshot: ${snapshot.courses.length} courses, ${snapshot.sections.length} sections (${snapshot.capturedAt}).`);
