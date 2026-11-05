import { Suspense } from "react";
import { HistoryList } from "@/components/admin/history/HistoryList";

export default function HistoryPage() {
  return (
    <div className="p-4">
      {/* The list reads the open line from the address (?mo=), which is known only in the browser. */}
      <Suspense fallback={null}>
        <HistoryList />
      </Suspense>
    </div>
  );
}
