import type { CustomHistory, Location } from 'preact-router';
import { isDemo } from './demo-mode';

// Hash routes keep refreshes and shared links on the static Pages entry point.
export function routeHref(path: string) {
  return isDemo ? `#${path}` : path;
}

function readLocation(): Location {
  const path = window.location.hash.slice(1);
  const url = new URL(path.startsWith('/') && !path.startsWith('//') ? path : '/', window.location.origin);
  return { pathname: url.pathname, search: url.search };
}

export const demoHistory: CustomHistory = {
  get location() { return readLocation(); },
  listen(callback) {
    const onChange = () => callback(readLocation());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  },
  push(path) { window.history.pushState(null, '', `${import.meta.env.BASE_URL}#${path}`); },
  replace(path) { window.history.replaceState(null, '', `${import.meta.env.BASE_URL}#${path}`); },
};
