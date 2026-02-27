import { useState, useEffect } from "preact/hooks";
import { apiFetch } from "@lib/api";
import { useAuth } from "../lib/auth";

interface CourseEnrollment {
  enrollment_id: number;
  enrolled_at: string;
  section_id: number;
  course_id: number;
  course_name: string;
  department: string;
  description: string;
  subject: string;
  catalog_number: string;
  professor_id: number | null;
  professor_name: string | null;
  season: string;
  year: number;
  section_number: string;
  component: string;
  instruction_mode: string;
  meeting_days: string;
  start_time: string | null;
  end_time: string | null;
}

interface ProfessorSection {
  section_id: number;
  course_id: number;
  course_name: string;
  department: string;
  description: string;
  season: string;
  year: number;
  enrolled_students: number;
}

export function Home(_props: { path?: string }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseEnrollment[] | ProfessorSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const endpoint =
      user.role === "student"
        ? `/students/${user.id}/courses`
        : `/professors/${user.id}/courses`;

    apiFetch<CourseEnrollment[] | ProfessorSection[]>(endpoint)
      .then((data) => setCourses(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1 class="text-3xl font-bold mb-2">Dashboard</h1>
      <p class="text-gray-500 mb-6">
        Welcome back, {user.name}.{" "}
        {user.role === "student" ? "Here are your enrolled courses." : "Here are the courses you teach."}
      </p>

      {loading && <p class="text-gray-400">Loading courses...</p>}

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div class="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p class="text-gray-500 text-lg mb-2">No courses yet</p>
          <p class="text-gray-400 text-sm mb-4">
            {user.role === "student"
              ? "Browse courses to enroll in a section."
              : "No sections are assigned to you yet."}
          </p>
          {user.role === "student" && (
            <a
              href="/courses"
              class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Browse Courses
            </a>
          )}
        </div>
      )}

      {!loading && courses.length > 0 && (
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={"section_id" in course ? course.section_id : (course as CourseEnrollment).enrollment_id}
              class="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between mb-2">
                <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {course.department}
                </span>
                <span class="text-xs text-gray-400">
                  {course.season} {course.year}
                </span>
              </div>
              <h3 class="font-semibold text-lg text-gray-900 mb-1">{course.course_name}</h3>
              {course.description && (
                <p class="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
              )}
              {user.role === "student" && "professor_name" in course && (
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Professor:</span> {(course as CourseEnrollment).professor_name || "TBA"}
                </p>
              )}
              {user.role === "professor" && "enrolled_students" in course && (
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Enrolled:</span>{" "}
                  {(course as ProfessorSection).enrolled_students} student(s)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
