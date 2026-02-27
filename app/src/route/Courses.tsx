import { useState, useEffect, useCallback } from "preact/hooks";
import { route } from "preact-router";
import { apiFetch } from "@lib/api";
import { useAuth } from "@lib/auth";

interface Course {
  id: number;
  osu_course_id: string;
  name: string;
  short_description: string;
  department: string;
  subject: string;
  catalog_number: string;
  description: string;
  credits_min: number;
  credits_max: number;
  grading: string;
  component: string;
  campus: string;
  tag_names: string | null;
  section_count: number;
  avg_rating: number | null;
  review_count: number;
  personalized_score: number | null;
}

interface Section {
  id: number;
  course_id: number;
  professor_id: number | null;
  semester_id: number;
  class_number: string;
  section_number: string;
  component: string;
  instruction_mode: string;
  enrollment_status: string;
  enrollment_total: number;
  enrollment_cap: number;
  meeting_days: string;
  start_time: string | null;
  end_time: string | null;
  building: string | null;
  room: string | null;
  course_name: string;
  department: string;
  professor_name: string | null;
  season: string;
  year: number;
}

interface PersonalizedSection {
  section_id: number;
  course_id: number;
  professor_id: number | null;
  instruction_mode: string;
  class_number: string;
  section_number: string;
  meeting_days: string;
  start_time: string | null;
  end_time: string | null;
  component: string;
  course_name: string;
  subject: string;
  catalog_number: string;
  department: string;
  professor_name: string | null;
  base_score: number;
  personalized_score: number | null;
  professor_personalized_score: number | null;
  review_count: number;
}

export function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [personalizedSections, setPersonalizedSections] = useState<PersonalizedSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [enrolledSections, setEnrolledSections] = useState<Set<number>>(new Set());
  const [enrollingSection, setEnrollingSection] = useState<number | null>(null);
  const [hasStudentTags, setHasStudentTags] = useState(false);

  // Check if student has profile tags set
  useEffect(() => {
    if (user?.role === "student") {
      apiFetch<Array<{ id: number }>>(`/students/${user.id}/tags`)
        .then((tags) => setHasStudentTags(tags.length > 0))
        .catch(() => setHasStudentTags(false));
    }
  }, [user]);

  // Fetch enrolled sections for student
  useEffect(() => {
    if (user?.role === "student") {
      apiFetch<Array<{ section_id: number }>>(`/students/${user.id}/courses`)
        .then((data) => {
          setEnrolledSections(new Set(data.map((e) => e.section_id)));
        })
        .catch(console.error);
    }
  }, [user]);

  // Fetch courses (personalized if student has tags)
  const fetchCourses = useCallback(
    async (query?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("limit", "50");

        // Use personalized endpoint if student has tags
        const endpoint =
          user?.role === "student" && hasStudentTags
            ? `/students/${user.id}/courses-personalized?${params}`
            : `/courses?${params}`;
        const data = await apiFetch<Course[]>(endpoint);
        setCourses(data);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setLoading(false);
      }
    },
    [user, hasStudentTags],
  );

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchCourses]);

  // Fetch sections for expanded course (with personalized scores)
  const toggleCourse = async (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      setSections([]);
      setPersonalizedSections([]);
      return;
    }
    setExpandedCourse(courseId);
    setSectionsLoading(true);
    try {
      // Fetch both regular sections and personalized scores in parallel
      const sectionPromise = apiFetch<Section[]>(`/sections?course_id=${courseId}`);

      if (user?.role === "student" && hasStudentTags) {
        const [secs, personalized] = await Promise.all([
          sectionPromise,
          apiFetch<PersonalizedSection[]>(
            `/students/${user.id}/recommendations?course_id=${courseId}`,
          ),
        ]);
        setSections(secs);
        setPersonalizedSections(personalized);
      } else {
        const secs = await sectionPromise;
        setSections(secs);
        setPersonalizedSections([]);
      }
    } catch (err) {
      console.error("Failed to fetch sections:", err);
      setSections([]);
      setPersonalizedSections([]);
    } finally {
      setSectionsLoading(false);
    }
  };

  // Build a lookup map for personalized section data
  const personalizedMap = new Map(
    personalizedSections.map((ps) => [ps.section_id, ps]),
  );

  const handleEnroll = async (sectionId: number) => {
    if (!user || user.role !== "student") return;
    setEnrollingSection(sectionId);
    try {
      await apiFetch(`/students/${user.id}/courses`, {
        method: "POST",
        body: JSON.stringify({ section_id: sectionId }),
      });
      setEnrolledSections((prev) => new Set([...prev, sectionId]));
    } catch (err) {
      console.error("Failed to enroll:", err);
    } finally {
      setEnrollingSection(null);
    }
  };

  const handleUnenroll = async (sectionId: number) => {
    if (!user || user.role !== "student") return;
    setEnrollingSection(sectionId);
    try {
      await apiFetch(`/students/${user.id}/courses/${sectionId}`, {
        method: "DELETE",
      });
      setEnrolledSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    } catch (err) {
      console.error("Failed to unenroll:", err);
    } finally {
      setEnrollingSection(null);
    }
  };

  const formatCredits = (min: number, max: number) =>
    min === max ? `${min}` : `${min}–${max}`;

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time;
  };

  const goToReviews = (professorId: number, courseId: number) => {
    route(`/reviews?professor_id=${professorId}&course_id=${courseId}`);
  };

  return (
    <div>
      <h1 class="text-2xl font-bold mb-6">Course Lookup</h1>

      {/* Search */}
      <div class="mb-6">
        <input
          type="text"
          placeholder="Search courses by name, subject, or catalog number..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
      </div>

      {/* Results */}
      {loading ? (
        <p class="text-gray-500 text-center py-8">Loading courses...</p>
      ) : courses.length === 0 ? (
        <p class="text-gray-500 text-center py-8">No courses found.</p>
      ) : (
        <div class="space-y-3">
          <p class="text-sm text-gray-500 mb-2">
            {courses.length} courses found
            {hasStudentTags && (
              <span class="ml-2 text-purple-600 font-medium">• Personalized for you</span>
            )}
          </p>
          {courses.map((course) => (
            <div key={course.id} class="border border-gray-200 rounded-lg overflow-hidden">
              {/* Course header - clickable */}
              <button
                onClick={() => toggleCourse(course.id)}
                class="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors focus:outline-none"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-blue-700">
                        {course.subject} {course.catalog_number}
                      </span>
                      <span class="text-gray-800 font-medium">{course.name}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{course.department}</span>
                      <span>•</span>
                      <span>{formatCredits(course.credits_min, course.credits_max)} cr</span>
                      <span>•</span>
                      <span>{course.section_count} section{course.section_count !== 1 ? "s" : ""}</span>
                      {course.avg_rating !== null && (
                        <>
                          <span>•</span>
                          <span class="flex items-center gap-1">
                            <StarRating rating={course.avg_rating} />
                            <span class="text-yellow-600 font-medium">{course.avg_rating}</span>
                            <span class="text-gray-400">({course.review_count})</span>
                          </span>
                        </>
                      )}
                    </div>
                    {course.tag_names && (
                      <div class="flex gap-1 mt-2 flex-wrap">
                        {course.tag_names.split(",").map((tag) => (
                          <span
                            key={tag}
                            class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div class="flex items-center gap-3 ml-4">
                    {/* Personalized score badge */}
                    {course.personalized_score !== null && (
                      <PersonalizedScoreBadge score={course.personalized_score} label="For You" />
                    )}
                    <span class="text-gray-400 text-lg">
                      {expandedCourse === course.id ? "▼" : "▶"}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded: sections */}
              {expandedCourse === course.id && (
                <div class="border-t border-gray-200 bg-gray-50 px-5 py-4">
                  {course.short_description && (
                    <p class="text-sm text-gray-600 mb-4">{course.short_description}</p>
                  )}
                  {sectionsLoading ? (
                    <p class="text-gray-500 text-sm">Loading sections...</p>
                  ) : sections.length === 0 ? (
                    <p class="text-gray-500 text-sm">No sections available.</p>
                  ) : (
                    <div class="space-y-2">
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">
                        Available Sections ({sections.length})
                      </h3>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead>
                            <tr class="text-left text-gray-500 border-b border-gray-200">
                              <th class="py-2 pr-3 font-medium">Section</th>
                              <th class="py-2 pr-3 font-medium">Instructor</th>
                              <th class="py-2 pr-3 font-medium">Mode</th>
                              <th class="py-2 pr-3 font-medium">Days/Time</th>
                              <th class="py-2 pr-3 font-medium">Location</th>
                              <th class="py-2 pr-3 font-medium">Status</th>
                              {hasStudentTags && (
                                <th class="py-2 pr-3 font-medium">Score</th>
                              )}
                              {user?.role === "student" && (
                                <th class="py-2 font-medium">Action</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sections.map((sec) => {
                              const isEnrolled = enrolledSections.has(sec.id);
                              const isProcessing = enrollingSection === sec.id;
                              const psData = personalizedMap.get(sec.id);
                              return (
                                <tr key={sec.id} class="border-b border-gray-100 last:border-0">
                                  <td class="py-2 pr-3">
                                    <span class="font-mono">{sec.section_number}</span>
                                    <span class="text-gray-400 text-xs ml-1">({sec.component})</span>
                                  </td>
                                  <td class="py-2 pr-3">
                                    {sec.professor_name ? (
                                      <span class="flex items-center gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (sec.professor_id) goToReviews(sec.professor_id, sec.course_id);
                                          }}
                                          class="text-blue-600 hover:underline hover:text-blue-800 text-left"
                                          title={`View reviews for ${sec.professor_name}`}
                                        >
                                          {sec.professor_name}
                                        </button>
                                        {psData?.professor_personalized_score !== null &&
                                          psData?.professor_personalized_score !== undefined && (
                                          <ScorePill score={psData.professor_personalized_score} size="sm" />
                                        )}
                                      </span>
                                    ) : (
                                      <span class="text-gray-400">TBA</span>
                                    )}
                                  </td>
                                  <td class="py-2 pr-3">
                                    <InstructionModeBadge mode={sec.instruction_mode} />
                                  </td>
                                  <td class="py-2 pr-3">
                                    {sec.meeting_days ? (
                                      <span>
                                        {sec.meeting_days}{" "}
                                        {sec.start_time && (
                                          <span class="text-gray-500">
                                            {formatTime(sec.start_time)}–{formatTime(sec.end_time)}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span class="text-gray-400">Async</span>
                                    )}
                                  </td>
                                  <td class="py-2 pr-3">
                                    {sec.building ? (
                                      <span>
                                        {sec.building} {sec.room}
                                      </span>
                                    ) : (
                                      <span class="text-gray-400">Online</span>
                                    )}
                                  </td>
                                  <td class="py-2 pr-3">
                                    <EnrollmentStatusBadge status={sec.enrollment_status} />
                                  </td>
                                  {hasStudentTags && (
                                    <td class="py-2 pr-3">
                                      {psData?.personalized_score !== null &&
                                        psData?.personalized_score !== undefined ? (
                                        <ScorePill score={psData.personalized_score} size="md" />
                                      ) : (
                                        <span class="text-gray-400 text-xs">—</span>
                                      )}
                                    </td>
                                  )}
                                  {user?.role === "student" && (
                                    <td class="py-2">
                                      {isEnrolled ? (
                                        <button
                                          onClick={() => handleUnenroll(sec.id)}
                                          disabled={isProcessing}
                                          class="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 group"
                                        >
                                          <span class="group-hover:hidden">
                                            {isProcessing ? "..." : "Enrolled ✓"}
                                          </span>
                                          <span class="hidden group-hover:inline">
                                            {isProcessing ? "..." : "Drop"}
                                          </span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleEnroll(sec.id)}
                                          disabled={isProcessing}
                                          class="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
                                        >
                                          {isProcessing ? "..." : "Enroll"}
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Helper components ---

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return (
    <span class="inline-flex text-yellow-500 text-xs">
      {"★".repeat(fullStars)}
      {hasHalf && "½"}
      {"☆".repeat(emptyStars)}
    </span>
  );
}

function InstructionModeBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    "In Person": "bg-green-100 text-green-700",
    "Distance Learning": "bg-purple-100 text-purple-700",
    "Hybrid Delivery": "bg-orange-100 text-orange-700",
    "Distance Enhanced": "bg-blue-100 text-blue-700",
  };
  return (
    <span class={`text-xs px-2 py-0.5 rounded-full ${colors[mode] || "bg-gray-100 text-gray-700"}`}>
      {mode}
    </span>
  );
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const isOpen = status?.toLowerCase() === "open";
  return (
    <span
      class={`text-xs px-2 py-0.5 rounded-full ${
        isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function PersonalizedScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 4 ? "bg-purple-100 text-purple-700 border-purple-200"
    : score >= 3 ? "bg-blue-100 text-blue-700 border-blue-200"
    : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <div class={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${color}`}>
      <span class="text-lg font-bold leading-tight">{score}</span>
      <span class="text-[10px] font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function ScorePill({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color =
    score >= 4 ? "bg-green-100 text-green-700"
    : score >= 3 ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";
  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span class={`${sizeClass} rounded-full font-semibold ${color}`} title="Personalized score">
      {score}/5
    </span>
  );
}
