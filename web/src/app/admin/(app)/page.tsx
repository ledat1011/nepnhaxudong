import { RecentChanges } from "@/components/admin/dashboard/RecentChanges";
import { Shortcuts } from "@/components/admin/dashboard/Shortcuts";
import { TodoList } from "@/components/admin/dashboard/TodoList";

/** The admin home: what is still missing (each row opens the field to fix), shortcuts, and the latest edits. */
export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <TodoList />
      <Shortcuts />
      <RecentChanges />
    </div>
  );
}
