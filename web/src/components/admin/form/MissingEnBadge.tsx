import { Badge } from "@/components/admin/ui/badge";

/** Shown next to a bilingual field whose Vietnamese text has words but whose English text is empty. */
export function MissingEnBadge() {
  return (
    <Badge variant="secondary" className="border-coat/40">
      Thiếu EN
    </Badge>
  );
}
