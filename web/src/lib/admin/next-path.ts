import { ADMIN_ROUTES } from "./routes";

// Control characters and backslashes are rejected: some browsers treat "\" like "/".
const UNSAFE_CHARACTERS = /[\u0000-\u001f\\]/;

const MAX_LENGTH = 2000;

/** A ".." segment, also written with percent-encoded dots, could climb out of /admin. */
function hasParentSegment(value: string): boolean {
  const path = value.split(/[?#]/, 1)[0];
  return path.split("/").some((segment) => segment.replace(/%2e/gi, ".") === "..");
}

/**
 * The page to open after sign-in. Only a path inside the admin area is accepted, so a link such as
 * `?next=https://evil.example` or `?next=//evil.example` cannot send the user to another site.
 * Anything else falls back to the dashboard.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || value.length > MAX_LENGTH || UNSAFE_CHARACTERS.test(value) || hasParentSegment(value)) {
    return ADMIN_ROUTES.home;
  }
  const inAdmin = value === ADMIN_ROUTES.home || value.startsWith(`${ADMIN_ROUTES.home}/`);
  return inAdmin ? value : ADMIN_ROUTES.home;
}
