import { RecentChanges } from "@/components/admin/dashboard/RecentChanges";
import { Shortcuts } from "@/components/admin/dashboard/Shortcuts";
import { TodoList } from "@/components/admin/dashboard/TodoList";

/**
 * The admin home: shortcuts, what is still missing (each row opens the field to fix), and the latest edits.
 * The shortcut tiles come first: they never move, while the to-do list grows when it has loaded.
 */
export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <Shortcuts />
      <TodoList />
      <RecentChanges />
    </div>
  );
}
