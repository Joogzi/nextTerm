import snapshot from './demo-snapshot.json';

// Anonymous visitor identity; courses and sections come only from the backend snapshot.
export const demoUser = { id: 1, name: 'Demo Student', email: 'demo@example.invalid', role: 'student' as const };
export interface DemoTag { id: number; type: string; name: string; description: string }
export interface DemoCourse {
  id: number; name: string; subject: string; catalog_number: string; department: string;
  description: string; short_description: string; credits_min: number; credits_max: number;
  tag_names: string | null; section_count: number; avg_rating: number | null;
  review_count: number; personalized_score: number | null;
}
export interface DemoSection {
  id: number; course_id: number; professor_id: number | null; semester_id: number;
  class_number: string; section_number: string; component: string; instruction_mode: string;
  enrollment_status: string; enrollment_total: number; enrollment_cap: number;
  meeting_days: string; start_time: string | null; end_time: string | null;
  building: string | null; room: string | null; course_name: string; department: string;
  professor_name: string | null; season: string; year: number;
  subject: string; catalog_number: string; base_score: number;
  personalized_score: number | null; professor_personalized_score: number | null; review_count: number;
}
export interface DemoReview {
  id: number;
  student_id: number;
  section_id: number;
  overall_rating: number;
  difficulty_rating: number;
  engagement_rating: number;
  clarity_rating: number;
  helpfulness_rating: number;
  workload_rating: number;
  student_grade: string | null;
  would_take_again: number;
  learning_style_match: number;
  comment: string | null;
  created_at: string;
  student_name: string;
  tag_names: string | null;
}

export interface DemoSnapshot {
  version: number;
  capturedAt: string;
  courses: DemoCourse[];
  sections: DemoSection[];
  profileTags: DemoTag[];
  reviewTags: DemoTag[];
  reviews: DemoReview[];
}
const data: DemoSnapshot = snapshot;
export const demoCourses = data.courses;
export const demoSections = data.sections;

interface SampleReview extends Omit<DemoReview, 'section_id'> {
  subject: string;
  catalogNumber: string;
  sectionNumber: string;
}

// The imported catalog contains no student review data. These clearly labeled,
// illustrative entries make the review interface useful in the static demo without
// presenting invented feedback as a real student submission.
const sampleReviews: SampleReview[] = [
  {
    id: -101, student_id: 0, subject: 'AEDECON', catalogNumber: '2005', sectionNumber: '0010',
    overall_rating: 4, difficulty_rating: 3, engagement_rating: 4, clarity_rating: 4,
    helpfulness_rating: 4, workload_rating: 3, learning_style_match: 4,
    student_grade: null, would_take_again: 1,
    comment: 'Illustrative review: Practical data exercises make the material easier to connect to real decisions. Keeping up with each assignment would help the quantitative topics feel manageable.',
    created_at: '2026-10-01T12:00:00Z', student_name: 'Sample Reviewer',
    tag_names: 'Clear Grading Criteria,Gives Good Feedback',
  },
  {
    id: -102, student_id: 0, subject: 'ASTRON', catalogNumber: '1100', sectionNumber: '010',
    overall_rating: 5, difficulty_rating: 2, engagement_rating: 5, clarity_rating: 4,
    helpfulness_rating: 4, workload_rating: 2, learning_style_match: 5,
    student_grade: null, would_take_again: 1,
    comment: 'Illustrative review: The real-world framing makes the science approachable, and the online format works well for students who prefer structured independent learning.',
    created_at: '2026-09-28T12:00:00Z', student_name: 'Sample Reviewer',
    tag_names: 'Amazing Lectures,Would Take Again',
  },
  {
    id: -103, student_id: 0, subject: 'ART', catalogNumber: '2100', sectionNumber: '0010',
    overall_rating: 4, difficulty_rating: 3, engagement_rating: 5, clarity_rating: 4,
    helpfulness_rating: 5, workload_rating: 4, learning_style_match: 5,
    student_grade: null, would_take_again: 1,
    comment: 'Illustrative review: Regular studio practice and critique provide a clear path for improving technique. Plan enough time outside class to finish drawings thoughtfully.',
    created_at: '2026-09-24T12:00:00Z', student_name: 'Sample Reviewer',
    tag_names: 'Gives Good Feedback,Participation Matters',
  },
  {
    id: -104, student_id: 0, subject: 'AEROENG', catalogNumber: '3560', sectionNumber: '0010',
    overall_rating: 4, difficulty_rating: 5, engagement_rating: 4, clarity_rating: 4,
    helpfulness_rating: 4, workload_rating: 5, learning_style_match: 4,
    student_grade: null, would_take_again: 1,
    comment: 'Illustrative review: The course is mathematically demanding, but working through problems consistently helps the aerodynamic concepts build on one another.',
    created_at: '2026-09-20T12:00:00Z', student_name: 'Sample Reviewer',
    tag_names: 'Lots of Homework,Respected',
  },
];

const resolvedSampleReviews = sampleReviews.flatMap(({ subject, catalogNumber, sectionNumber, ...review }) => {
  const section = data.sections.find(candidate =>
    candidate.subject === subject &&
    candidate.catalog_number === catalogNumber &&
    candidate.section_number === sectionNumber
  );
  return section ? [{ ...review, section_id: section.id }] : [];
});

export const demoReviews: DemoReview[] = [...data.reviews, ...resolvedSampleReviews];
export const profileTags = data.profileTags;
export const reviewTags = data.reviewTags;
