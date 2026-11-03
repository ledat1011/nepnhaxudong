import { NOT_FOUND_TITLE, NotFoundContent } from "@/components/layout/NotFoundContent";

// Rendered when a page of the [lang] segment calls notFound(), for example a story that
// does not exist. Next renders it in the browser after the page loads, so it brings its own
// title: only the root not-found file may export `metadata`.
export default function LangNotFound() {
  return (
    <>
      <title>{NOT_FOUND_TITLE}</title>
      <NotFoundContent />
    </>
  );
}
