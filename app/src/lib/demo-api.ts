import { demoCourses, demoSections, demoReviews, demoUser, profileTags, reviewTags, type DemoReview, type DemoSnapshot } from './demo-data';

export const DEMO_STORAGE_KEY = 'nextterm-demo-v1';
interface DemoState { version: 1; enrolled: number[]; tagIds: number[]; reviews: DemoReview[] }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function initialState(tags: typeof profileTags): DemoState {
  return {
    version: 1, enrolled: [], reviews: [],
    tagIds: tags.filter(t => ['Hands-On Learner', 'Morning Classes', 'STEM'].includes(t.name)).map(t => t.id),
  };
}

type Catalog = Pick<DemoSnapshot, 'courses' | 'sections' | 'reviews' | 'profileTags' | 'reviewTags'>;
const bundledCatalog: Catalog = { courses: demoCourses, sections: demoSections, reviews: demoReviews, profileTags, reviewTags };

export function createDemoApi(storage?: StorageLike, catalog: Catalog = bundledCatalog) {
  const { courses: demoCourses, sections: demoSections, reviews: demoReviews, profileTags, reviewTags } = catalog;
  let state = initialState(profileTags);
  try {
    const saved = JSON.parse(storage?.getItem(DEMO_STORAGE_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.enrolled) && Array.isArray(saved.tagIds) &&
        Array.isArray(saved.reviews) && saved.enrolled.every((id: unknown) => demoSections.some(s => s.id === id)) &&
        saved.tagIds.every((id: unknown) => profileTags.some(t => t.id === id)) &&
        saved.reviews.every((r: DemoReview) => r && Number.isFinite(r.id) && demoSections.some(s => s.id === r.section_id))) {
      state = saved;
    }
  } catch { /* Storage may be disabled or contain an old/corrupt demo. */ }

  function save() {
    try { storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); }
    catch { /* Keep the demo usable in memory when browser storage is unavailable. */ }
  }

  function section(id: number) {
    const value = demoSections.find(s => s.id === id);
    if (!value) throw new Error('Demo section not found');
    return value;
  }

  return async (path: string, init: RequestInit = {}): Promise<unknown> => {
    const url = new URL(path, 'https://demo.invalid');
    const pathname = url.pathname;
    const method = (init.method || 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
    const selectedTags = () => profileTags.filter(t => state.tagIds.includes(t.id));
    const enrollmentPath = /^\/students\/1\/courses(?:\/(\d+))?$/.exec(pathname);

    if (pathname === '/profile/tags' && method === 'GET') return structuredClone(profileTags);
    if (pathname === '/reviews/tags' && method === 'GET') return structuredClone(reviewTags);
    if (pathname === '/students/1/tags') {
      if (method === 'PUT') {
        if (!Array.isArray(body.tag_ids) || body.tag_ids.some((id: number) => !profileTags.some(t => t.id === id))) throw new Error('Invalid demo tags');
        state.tagIds = [...new Set<number>(body.tag_ids)]; save();
      } else if (method !== 'GET') throw new Error('Unsupported demo method');
      return selectedTags();
    }
    if (enrollmentPath) {
      if (method === 'POST' && !enrollmentPath[1]) {
        const id = Number(body.section_id); section(id);
        if (!state.enrolled.includes(id)) state.enrolled.push(id);
        save(); return { success: true };
      }
      if (method === 'DELETE' && enrollmentPath[1]) {
        state.enrolled = state.enrolled.filter(id => id !== Number(enrollmentPath[1]));
        save(); return { success: true };
      }
      if (method === 'GET' && !enrollmentPath[1]) return state.enrolled.map(id => ({
        ...section(id), section_id: id, enrollment_id: id, enrolled_at: '2026-02-15T12:00:00Z',
        description: demoCourses.find(c => c.id === section(id).course_id)!.description,
      }));
    }
    if ((pathname === '/courses' || pathname === '/students/1/courses-personalized') && method === 'GET') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
      const limit = Math.max(0, Number(url.searchParams.get('limit') || 50));
      return demoCourses.filter(c => `${c.name} ${c.subject} ${c.catalog_number} ${c.description}`.toLowerCase().includes(query))
        .slice(offset, offset + limit).map(c => ({ ...c, personalized_score: state.tagIds.length ? c.personalized_score : null }));
    }
    if ((pathname === '/sections' || pathname === '/students/1/recommendations') && method === 'GET') {
      const courseId = url.searchParams.get('course_id');
      return demoSections.filter(s => !courseId || s.course_id === Number(courseId)).map(s => ({
        ...s, section_id: s.id,
        personalized_score: state.tagIds.length ? s.personalized_score : null,
        professor_personalized_score: state.tagIds.length ? s.professor_personalized_score : null,
      }));
    }
    if (pathname === '/reviews') {
      const allReviews = () => [...state.reviews, ...demoReviews].map(r => ({ ...section(r.section_id), ...r }));
      if (method === 'GET') {
        return allReviews().filter(r => (!url.searchParams.get('course_id') || r.course_id === Number(url.searchParams.get('course_id'))) &&
          (!url.searchParams.get('professor_id') || r.professor_id === Number(url.searchParams.get('professor_id'))));
      }
      if (method === 'POST') {
        const sectionId = Number(body.section_id); section(sectionId);
        if (!state.enrolled.includes(sectionId)) throw new Error('Enroll before reviewing this demo section');
        if (state.reviews.some(r => r.section_id === sectionId)) throw new Error('You already reviewed this demo section');
        const ratings = ['overall_rating', 'difficulty_rating', 'engagement_rating', 'clarity_rating', 'helpfulness_rating', 'workload_rating', 'learning_style_match'] as const;
        for (const key of ratings) if (!Number.isInteger(body[key]) || body[key] < 1 || body[key] > 5) throw new Error('Ratings must be between 1 and 5');
        const review: DemoReview = {
          id: Math.max(1000, ...state.reviews.map(r => r.id)) + 1, student_id: demoUser.id, section_id: sectionId,
          overall_rating: body.overall_rating, difficulty_rating: body.difficulty_rating,
          engagement_rating: body.engagement_rating, clarity_rating: body.clarity_rating,
          helpfulness_rating: body.helpfulness_rating, workload_rating: body.workload_rating,
          learning_style_match: body.learning_style_match, would_take_again: body.would_take_again ? 1 : 0,
          student_grade: body.student_grade || null, comment: String(body.comment || '').slice(0,5000) || null,
          student_name: demoUser.name, created_at: new Date().toISOString(),
          tag_names: reviewTags.filter(t => (body.tag_ids || []).includes(t.id)).map(t => t.name).join(',') || null,
        };
        state.reviews.unshift(review); save();
        return { ...section(sectionId), ...review };
      }
    }
    throw new Error(`Unsupported demo request: ${method} ${pathname}`);
  };
}

let browserApi: ReturnType<typeof createDemoApi> | undefined;
export function demoApi(path: string, init?: RequestInit) {
  if (!browserApi) {
    let storage: StorageLike | undefined;
    try { storage = window.localStorage; } catch { /* Memory-only mode. */ }
    browserApi = createDemoApi(storage);
  }
  return browserApi(path, init);
}
