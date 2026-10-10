import { routeHref } from "../lib/navigation";
import { useRouter } from "preact-router";
import { useAuth } from "../lib/auth";

export function Header() {
  const [routerState] = useRouter();
  const url = routerState?.url ?? "/";
  const { user, logout } = useAuth();

  return (
    <nav class="flex items-center justify-between py-4 border-b border-gray-200 mb-8">
      <div class="flex gap-4">
        <a
          href={routeHref("/")}
          class={`no-underline font-medium px-4 py-2 rounded transition-colors ${
            url === "/" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Home
        </a>
        <a
          href={routeHref("/courses")}
          class={`no-underline font-medium px-4 py-2 rounded transition-colors ${
            url === "/courses" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Courses
        </a>
        <a
          href={routeHref("/reviews")}
          class={`no-underline font-medium px-4 py-2 rounded transition-colors ${
            url === "/reviews" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Reviews
        </a>
        <a
          href={routeHref("/profile")}
          class={`no-underline font-medium px-4 py-2 rounded transition-colors ${
            url === "/profile" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Profile
        </a>
        <a
          href={routeHref("/about")}
          class={`no-underline font-medium px-4 py-2 rounded transition-colors ${
            url === "/about" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          About
        </a>
      </div>
      {user && (
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">
            {user.name} <span class="text-gray-400">({user.role})</span>
          </span>
          <button
            onClick={logout}
            class="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
