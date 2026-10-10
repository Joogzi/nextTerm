import { describe, expect, test } from 'bun:test';
import { createDemoApi, DEMO_STORAGE_KEY } from '../src/lib/demo-api';
import type { DemoSnapshot } from '../src/lib/demo-data';

// Synthetic data is confined to tests; the published catalog is captured from the backend.
const catalog: Pick<DemoSnapshot, 'courses' | 'sections' | 'reviews' | 'profileTags' | 'reviewTags'> = {
  courses: [{ id: 7, name: 'Test Software', subject: 'CSE', catalog_number: '2221', department: 'Engineering',
    description: 'Components', short_description: 'Components', credits_min: 4, credits_max: 4,
    tag_names: null, section_count: 1, avg_rating: null, review_count: 0, personalized_score: null }],
  sections: [{ id: 70, course_id: 7, professor_id: null, semester_id: 1, class_number: '700', section_number: '001',
    component: 'LEC', instruction_mode: 'In Person', enrollment_status: 'Open', enrollment_total: 0, enrollment_cap: 30,
    meeting_days: 'MWF', start_time: '10:00 am', end_time: '10:55 am', building: null, room: null,
    course_name: 'Test Software', department: 'Engineering', professor_name: null, season: 'Autumn', year: 2026,
    subject: 'CSE', catalog_number: '2221', base_score: 3, personalized_score: null, professor_personalized_score: null, review_count: 0 }],
  profileTags: [{ id: 2, type: 'interest', name: 'STEM', description: 'Test interest' }],
  reviewTags: [{ id: 3, type: 'review', name: 'Clear Grading Criteria', description: 'Test tag' }], reviews: [],
};
function storage() {
  const items = new Map<string,string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key,value); } };
}
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

describe('backend snapshot demo', () => {
  test('searches captured courses and does not fabricate recommendation scores', async () => {
    const api = createDemoApi(storage(), catalog);
    expect(await api('/courses?q=2221')).toHaveLength(1);
    expect(await api('/courses?q=unmatched')).toEqual([]);
    expect(await api('/students/1/recommendations?course_id=7')).toMatchObject([{ section_id: 70, personalized_score: null }]);
  });
  test('enrollment is idempotent, survives reload, and can be removed', async () => {
    const local = storage(); const api = createDemoApi(local,catalog);
    await api('/students/1/courses',post({ section_id: 70 }));
    await api('/students/1/courses',post({ section_id: 70 }));
    const reloaded = createDemoApi(local,catalog);
    expect(await reloaded('/students/1/courses')).toMatchObject([{ section_id: 70, subject: 'CSE' }]);
    expect(await reloaded('/students/1/courses')).toHaveLength(1);
    await reloaded('/students/1/courses/70',{ method: 'DELETE' });
    expect(await reloaded('/students/1/courses')).toEqual([]);
  });
  test('profile choices persist and unknown IDs fail', async () => {
    const local = storage(); const api = createDemoApi(local,catalog);
    await api('/students/1/tags',{ method: 'PUT', body: JSON.stringify({tag_ids: []}) });
    expect(await createDemoApi(local,catalog)('/students/1/tags')).toEqual([]);
    await expect(api('/students/1/tags',{ method: 'PUT',body:'{"tag_ids":[999]}' })).rejects.toThrow();
    await expect(api('/students/1/courses',post({section_id:999}))).rejects.toThrow();
  });
  test('local reviews require enrollment and reject duplicates; filters preserve joins', async () => {
    const local = storage(); const api = createDemoApi(local,catalog);
    const review = { section_id:70, overall_rating:5, difficulty_rating:3, engagement_rating:5,
      clarity_rating:4, helpfulness_rating:4, workload_rating:3, learning_style_match:5,
      comment:'Local test review', tag_ids:[3], would_take_again:true };
    await expect(api('/reviews',post(review))).rejects.toThrow('Enroll');
    await api('/students/1/courses',post({section_id:70}));
    await api('/reviews',post(review));
    await expect(api('/reviews',post(review))).rejects.toThrow('already reviewed');
    expect(await createDemoApi(local,catalog)('/reviews?course_id=7')).toMatchObject([{ comment:'Local test review', subject:'CSE',tag_names:'Clear Grading Criteria' }]);
    expect(await api('/reviews?course_id=99')).toEqual([]);
  });
  test('corrupt or unavailable browser storage does not prevent use', async () => {
    const local = storage(); local.setItem(DEMO_STORAGE_KEY,'invalid json');
    expect(await createDemoApi(local,catalog)('/courses')).toHaveLength(1);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const api = createDemoApi(blocked,catalog);
    await api('/students/1/courses',post({section_id:70}));
    expect(await api('/students/1/courses')).toHaveLength(1);
  });
  test('unknown routes fail explicitly instead of silently returning an empty success', async () => {
    await expect(createDemoApi(storage(),catalog)('/unknown')).rejects.toThrow('Unsupported');
  });
});
