import { useRouter } from "preact-router";

export function Header() {
  const [routerState] = useRouter();
  const url = routerState?.url ?? "/";

  return (
    <nav>
      <a href="/" class={url === "/" ? "active" : ""}>
        Home
      </a>
      <a href="/about" class={url === "/about" ? "active" : ""}>
        About
      </a>
    </nav>
  );
}
