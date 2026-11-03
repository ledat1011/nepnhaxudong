type StoryBodyProps = {
  /** Already sanitized by the API (jsoup allow-list), so it is not filtered again here. */
  html: string;
};

// Tailwind preflight removes the default look of headings, lists and links, so it is set here.
const BODY_CLASS = [
  "max-w-[65ch] text-lg leading-8 [overflow-wrap:anywhere]",
  "[&_p]:my-5",
  "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug",
  "[&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:leading-snug",
  "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-1.5 [&_li]:pl-1",
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-grain [&_blockquote]:bg-straw [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:italic",
  "[&_a]:font-bold [&_a]:text-coat [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-earth",
  "[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-coat",
  "[&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl",
].join(" ");

export function StoryBody({ html }: StoryBodyProps) {
  return <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: html }} />;
}
