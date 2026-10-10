import { routeHref } from "../lib/navigation";
export function NotFound(_props: { default?: boolean }) {
  return (
    <div>
      <h1 class="text-3xl font-bold mb-4">404 - Not Found</h1>
      <p class="leading-relaxed text-gray-600 mb-4">The page you are looking for does not exist.</p>
      <a href={routeHref("/")} class="text-blue-600 hover:underline">Go back home</a>
    </div>
  );
}
