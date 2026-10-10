import { useState, useEffect } from "preact/hooks";
import { apiFetch } from "@lib/api";
import { useAuth } from "@lib/auth";

interface ProfileTag {
  id: number;
  type: string;
  name: string;
  description: string;
}

export function Profile(_props: { path?: string }) {
  const { user } = useAuth();
  const [availableTags, setAvailableTags] = useState<ProfileTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch available profile tags & current student tags
  useEffect(() => {
    if (!user || user.role !== "student") return;

    Promise.all([
      apiFetch<ProfileTag[]>("/profile/tags"),
      apiFetch<ProfileTag[]>(`/students/${user.id}/tags`),
    ])
      .then(([available, current]) => {
        setAvailableTags(available);
        setSelectedTagIds(new Set(current.map((t) => t.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await apiFetch(`/students/${user.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tag_ids: Array.from(selectedTagIds) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save tags:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "student") {
    return (
      <div class="text-center py-12">
        <p class="text-gray-500">Profile tags are only available for students.</p>
      </div>
    );
  }

  if (loading) {
    return <p class="text-gray-500 text-center py-8">Loading profile...</p>;
  }

  // Group tags by type
  const grouped: Record<string, ProfileTag[]> = {};
  for (const tag of availableTags) {
    if (!grouped[tag.type]) grouped[tag.type] = [];
    grouped[tag.type].push(tag);
  }

  const typeLabels: Record<string, { title: string; subtitle: string }> = {
    learning_style: {
      title: "Learning Style",
      subtitle: "How do you learn best?",
    },
    preference: {
      title: "Course Preferences",
      subtitle: "What matters most to you in a course?",
    },
    interest: {
      title: "Academic Interests",
      subtitle: "What areas are you interested in?",
    },
  };

  const typeOrder = ["learning_style", "preference", "interest"];

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">My Profile</h1>
          <p class="text-gray-500 text-sm mt-1">
            Select tags that describe your learning style, preferences, and interests.
            These will be used to personalize your course recommendations.
          </p>
        </div>
        <div class="flex items-center gap-3">
          {saved && (
            <span class="text-green-600 text-sm font-medium">Saved!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            class="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      <div class="space-y-8">
        {typeOrder
          .filter((type) => grouped[type])
          .map((type) => (
            <div key={type}>
              <h2 class="text-lg font-semibold text-gray-800 mb-1">
                {typeLabels[type]?.title || type}
              </h2>
              <p class="text-sm text-gray-500 mb-3">
                {typeLabels[type]?.subtitle}
              </p>
              <div class="flex flex-wrap gap-2">
                {grouped[type].map((tag) => {
                  const isSelected = selectedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      class={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                      }`}
                      title={tag.description}
                    >
                      {isSelected && <span class="mr-1">✓</span>}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      <div class="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p class="text-sm text-blue-700">
          <strong>How this works:</strong> Your selected tags are matched against review tags left
          by other students. Courses where reviews align with your preferences will receive a higher
          personalized score in the course lookup, helping you find the best courses for your
          learning style.
        </p>
      </div>
    </div>
  );
}
