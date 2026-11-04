import { ADMIN_ROUTES } from "./routes";

// Control characters and backslashes are rejected: some browsers treat "\" like "/".
const UNSAFE_CHARACTERS = /[\u0000-\u001f\\]/;

/**
 * The page to open after sign-in. Only a path inside the admin area is accepted, so a link such as
 * `?next=https://evil.example` or `?next=//evil.example` cannot send the user to another site.
 * Anything else falls back to the dashboard.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || UNSAFE_CHARACTERS.test(value)) return ADMIN_ROUTES.home;
  const inAdmin = value === ADMIN_ROUTES.home || value.startsWith(`${ADMIN_ROUTES.home}/`);
  return inAdmin ? value : ADMIN_ROUTES.home;
}
