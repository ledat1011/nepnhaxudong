import { Button } from "@/components/admin/ui/button";

type Props = {
  dirty: boolean;
  pending: boolean;
  onSave(): void;
  onCancel(): void;
};

/** Sticks just above the bottom navigation (a 56 px bar plus the safe area). */
export function SaveBar({ dirty, pending, onSave, onCancel }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t bg-card p-3">
      <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={pending || !dirty}>
        Hủy
      </Button>
      <Button type="button" className="flex-1" onClick={onSave} disabled={!dirty || pending}>
        {pending ? "Đang lưu…" : "Lưu"}
      </Button>
    </div>
  );
}
