import { MissingEnSummary } from "@/components/admin/dashboard/MissingEnSummary";
import { RecentChanges } from "@/components/admin/dashboard/RecentChanges";
import { Shortcuts } from "@/components/admin/dashboard/Shortcuts";

/** The admin home: shortcuts, what still misses English, and the latest edits. */
export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <Shortcuts />
      <MissingEnSummary />
      <RecentChanges />
    </div>
  );
}
