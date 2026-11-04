import { NOT_SAVED_NOTICE } from "@/lib/admin/field-errors";

/**
 * The error of one field, right under its box. The box points to it with `aria-describedby="<id>-error"`
 * (see `invalidProps`), so a screen reader reads it when the cursor lands in the box.
 */
export function FieldError({ id, message }: { id: string; message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

/** One line at the top of a form that explains the `*` of the required fields. */
export function RequiredNote() {
  return <p className="text-sm text-muted-foreground">Ô có dấu * là ô phải điền.</p>;
}

/** The `*` after the label of a required field. Screen readers hear "required" from the box itself. */
export function RequiredMark() {
  return <span aria-hidden> *</span>;
}

/** In a dialog, above its buttons: says why nothing was saved while a field shows an error. */
export function NotSavedNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {NOT_SAVED_NOTICE}
    </p>
  );
}
