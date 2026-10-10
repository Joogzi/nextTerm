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
export const demoReviews = data.reviews;
export const profileTags = data.profileTags;
export const reviewTags = data.reviewTags;
