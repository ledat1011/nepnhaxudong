import { MASCOT_INNER, MASCOT_VIEWBOX } from "./generated/mascot";

type MascotProps = {
  className?: string;
  title: string;
};

/** The layered mascot. Its inner markup has element ids, so render it once per page. */
export function Mascot({ className, title }: MascotProps) {
  return (
    <svg
      viewBox={MASCOT_VIEWBOX}
      role="img"
      data-mascot=""
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <g dangerouslySetInnerHTML={{ __html: MASCOT_INNER }} />
    </svg>
  );
}
