import { LOGO_ICON_INNER, LOGO_ICON_VIEWBOX } from "./generated/logo-icon";

/** Icon version of the logo. The markup has no ids, so it can appear more than once per page. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_ICON_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: LOGO_ICON_INNER }}
    />
  );
}
