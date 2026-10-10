import { routeHref } from "../lib/navigation";
import { useState, useEffect } from "preact/hooks";
import { route } from "preact-router";
import { apiFetch } from "@lib/api";
import { useAuth } from "@lib/auth";

interface Review {
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
  course_id: number;
  course_name: string;
  subject: string;
  catalog_number: string;
  professor_name: string | null;
  season: string;
  year: number;
  section_number: string;
  component: string;
  tag_names: string | null;
}

interface EnrolledCourse {
  enrollment_id: number;
  section_id: number;
  course_id: number;
  course_name: string;
  subject: string;
  catalog_number: string;
  professor_name: string | null;
  section_number: string;
}

interface ReviewTag {
  id: number;
  name: string;
  description: string;
}

export function Reviews({ professor_id, course_id }: { professor_id?: string; course_id?: string; path?: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [availableTags, setAvailableTags] = useState<ReviewTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filterProfessorId, setFilterProfessorId] = useState(professor_id || "");
  const [filterCourseId, setFilterCourseId] = useState(course_id || "");
  const [filterProfessorName, setFilterProfessorName] = useState("");

  // Form state
  const [form, setForm] = useState({
    section_id: 0,
    overall_rating: 5,
    difficulty_rating: 3,
    engagement_rating: 5,
    clarity_rating: 5,
    helpfulness_rating: 5,
    workload_rating: 3,
    student_grade: "",
    would_take_again: true,
    learning_style_match: 4,
    comment: "",
    tag_ids: [] as number[],
  });

  // Fetch all reviews (with optional filters)
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCourseId) params.set("course_id", filterCourseId);
    if (filterProfessorId) params.set("professor_id", filterProfessorId);
    apiFetch<Review[]>(`/reviews?${params}`)
      .then((data) => {
        setReviews(data);
        // Extract professor name from results for filter display
        if (filterProfessorId && data.length > 0 && data[0].professor_name) {
          setFilterProfessorName(data[0].professor_name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterCourseId, filterProfessorId]);

  // Fetch enrolled courses for the review form
  useEffect(() => {
    if (user?.role === "student") {
      apiFetch<EnrolledCourse[]>(`/students/${user.id}/courses`)
        .then(setEnrolledCourses)
        .catch(console.error);
    }
  }, [user]);

  // Fetch available review tags
  useEffect(() => {
    apiFetch<ReviewTag[]>("/reviews/tags")
      .then(setAvailableTags)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!user || !form.section_id) return;

    setSubmitting(true);
    try {
      const review = await apiFetch<Review>("/reviews", {
        method: "POST",
        body: JSON.stringify({
          student_id: user.id,
          section_id: form.section_id,
          overall_rating: form.overall_rating,
          difficulty_rating: form.difficulty_rating,
          engagement_rating: form.engagement_rating,
          clarity_rating: form.clarity_rating,
          helpfulness_rating: form.helpfulness_rating,
          workload_rating: form.workload_rating,
          student_grade: form.student_grade || null,
          would_take_again: form.would_take_again,
          learning_style_match: form.learning_style_match,
          comment: form.comment || null,
          tag_ids: form.tag_ids,
        }),
      });
      // Re-fetch reviews to include the new one with full join data
      const refetchParams = new URLSearchParams();
      if (filterCourseId) refetchParams.set("course_id", filterCourseId);
      if (filterProfessorId) refetchParams.set("professor_id", filterProfessorId);
      const updatedReviews = await apiFetch<Review[]>(`/reviews?${refetchParams}`);
      setReviews(updatedReviews);
      setShowForm(false);
      setForm({
        section_id: 0,
        overall_rating: 5,
        difficulty_rating: 3,
        engagement_rating: 5,
        clarity_rating: 5,
        helpfulness_rating: 5,
        workload_rating: 3,
        student_grade: "",
        would_take_again: true,
        learning_style_match: 4,
        comment: "",
        tag_ids: [],
      });
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Failed to submit review. You may have already reviewed this section.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Course Reviews</h1>
        {user?.role === "student" && (
          <button
            onClick={() => setShowForm(!showForm)}
            class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              showForm
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {showForm ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* Active Filters */}
      {(filterProfessorId || filterCourseId) && (
        <div class="mb-6 flex items-center gap-2 flex-wrap">
          <span class="text-sm text-gray-500">Filtering by:</span>
          {filterProfessorName && (
            <span class="inline-flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              Prof. {filterProfessorName}
              <button
                onClick={() => {
                  setFilterProfessorId("");
                  setFilterProfessorName("");
                  const params = new URLSearchParams();
                  if (filterCourseId) params.set("course_id", filterCourseId);
                  route(`/reviews${params.toString() ? "?" + params : ""}`);
                }}
                class="ml-1 text-blue-500 hover:text-blue-800 font-bold"
              >
                ×
              </button>
            </span>
          )}
          {filterCourseId && reviews.length > 0 && (
            <span class="inline-flex items-center gap-1 text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {reviews[0].subject} {reviews[0].catalog_number}
              <button
                onClick={() => {
                  setFilterCourseId("");
                  const params = new URLSearchParams();
                  if (filterProfessorId) params.set("professor_id", filterProfessorId);
                  route(`/reviews${params.toString() ? "?" + params : ""}`);
                }}
                class="ml-1 text-green-500 hover:text-green-800 font-bold"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setFilterProfessorId("");
              setFilterProfessorName("");
              setFilterCourseId("");
              route("/reviews");
            }}
            class="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Review Form */}
      {showForm && user?.role === "student" && (
        <form onSubmit={handleSubmit} class="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-5">
          <h2 class="text-lg font-semibold mb-2">New Review</h2>

          {/* Course/Section select */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Course Section <span class="text-red-500">*</span>
            </label>
            {enrolledCourses.length === 0 ? (
              <p class="text-sm text-gray-500">
                You must enroll in a course before writing a review.{" "}
                <a href={routeHref("/courses")} class="text-blue-600 hover:underline">
                  Browse courses
                </a>
              </p>
            ) : (
              <select
                value={form.section_id}
                onChange={(e) => updateForm("section_id", Number((e.target as HTMLSelectElement).value))}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={0}>Select a course section...</option>
                {enrolledCourses.map((c) => (
                  <option key={c.section_id} value={c.section_id}>
                    {c.subject} {c.catalog_number} - {c.course_name} (Section {c.section_number}
                    {c.professor_name ? `, Prof. ${c.professor_name}` : ""})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Rating sliders */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RatingSlider
              label="Overall Rating"
              value={form.overall_rating}
              onChange={(v) => updateForm("overall_rating", v)}
            />
            <RatingSlider
              label="Difficulty"
              value={form.difficulty_rating}
              onChange={(v) => updateForm("difficulty_rating", v)}
              lowLabel="Easy"
              highLabel="Hard"
            />
            <RatingSlider
              label="Engagement"
              value={form.engagement_rating}
              onChange={(v) => updateForm("engagement_rating", v)}
            />
            <RatingSlider
              label="Clarity"
              value={form.clarity_rating}
              onChange={(v) => updateForm("clarity_rating", v)}
            />
            <RatingSlider
              label="Helpfulness"
              value={form.helpfulness_rating}
              onChange={(v) => updateForm("helpfulness_rating", v)}
            />
            <RatingSlider
              label="Workload"
              value={form.workload_rating}
              onChange={(v) => updateForm("workload_rating", v)}
              lowLabel="Light"
              highLabel="Heavy"
            />
            <RatingSlider
              label="Learning Style Match"
              value={form.learning_style_match}
              onChange={(v) => updateForm("learning_style_match", v)}
            />
          </div>

          {/* Grade & Would take again */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Your Grade</label>
              <select
                value={form.student_grade}
                onChange={(e) => updateForm("student_grade", (e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Prefer not to say</option>
                {["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E", "S", "U"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Would Take Again?</label>
              <div class="flex gap-4 mt-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="would_take_again"
                    checked={form.would_take_again}
                    onChange={() => updateForm("would_take_again", true)}
                    class="text-blue-600"
                  />
                  <span class="text-sm">Yes</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="would_take_again"
                    checked={!form.would_take_again}
                    onChange={() => updateForm("would_take_again", false)}
                    class="text-blue-600"
                  />
                  <span class="text-sm">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tags <span class="text-gray-400 font-normal">(select all that apply)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = form.tag_ids.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        tag_ids: isSelected
                          ? prev.tag_ids.filter((id) => id !== tag.id)
                          : [...prev.tag_ids, tag.id],
                      }));
                    }}
                    class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    }`}
                    title={tag.description}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={form.comment}
              onInput={(e) => updateForm("comment", (e.target as HTMLTextAreaElement).value)}
              placeholder="Share your experience with this course..."
              rows={4}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.section_id}
            class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <p class="text-gray-500 text-center py-8">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div class="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p class="text-gray-500 text-lg mb-2">No reviews yet</p>
          <p class="text-gray-400 text-sm">Be the first to review a course!</p>
        </div>
      ) : (
        <div class="space-y-4">
          <p class="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Components ---

function RatingSlider({
  label,
  value,
  onChange,
  lowLabel = "Poor",
  highLabel = "Excellent",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-sm font-medium text-gray-700">{label}</label>
        <span class="text-sm font-semibold text-blue-600">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div class="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const ratingColor = (r: number) => {
    if (r >= 4) return "text-green-600 bg-green-50";
    if (r >= 3) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div class="border border-gray-200 rounded-lg p-5 bg-white">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h3 class="font-semibold text-gray-900">
            {review.subject} {review.catalog_number} — {review.course_name}
          </h3>
          <p class="text-sm text-gray-500">
            Section {review.section_number} • {review.professor_name || "TBA"} •{" "}
            {review.season} {review.year}
          </p>
        </div>
        <div class={`text-lg font-bold px-3 py-1 rounded-lg ${ratingColor(review.overall_rating)}`}>
          {review.overall_rating}/5
        </div>
      </div>

      {/* Rating pills */}
      <div class="flex flex-wrap gap-2 mb-3">
        <RatingPill label="Difficulty" value={review.difficulty_rating} />
        <RatingPill label="Engagement" value={review.engagement_rating} />
        <RatingPill label="Clarity" value={review.clarity_rating} />
        <RatingPill label="Helpfulness" value={review.helpfulness_rating} />
        <RatingPill label="Workload" value={review.workload_rating} />
      </div>

      {/* Review Tags */}
      {review.tag_names && (
        <div class="flex flex-wrap gap-1.5 mb-3">
          {review.tag_names.split(",").map((tag) => (
            <span
              key={tag}
              class="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Comment */}
      {review.comment && (
        <p class="text-gray-700 text-sm mb-3 leading-relaxed">"{review.comment}"</p>
      )}

      {/* Meta */}
      <div class="flex items-center gap-3 text-xs text-gray-400">
        <span>By {review.student_name}</span>
        {review.student_grade && <span>• Grade: {review.student_grade}</span>}
        <span>• {review.would_take_again ? "Would take again ✓" : "Would not take again ✗"}</span>
        <span>• {new Date(review.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function RatingPill({ label, value }: { label: string; value: number }) {
  const bg =
    value >= 4 ? "bg-green-100 text-green-700" :
    value >= 3 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return (
    <span class={`text-xs px-2 py-1 rounded-full ${bg}`}>
      {label}: {value}/5
    </span>
  );
}
