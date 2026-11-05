type SectionHeadingProps = {
  id: string;
  title: string;
};

/** Section title; `id` is the anchor target for the header menu. */
export function SectionHeading({ id, title }: SectionHeadingProps) {
  return (
    <div data-reveal className="mb-8">
      <h2 id={id} className="scroll-mt-20 font-display text-3xl text-balance text-earth md:text-4xl">
        {title}
      </h2>
    </div>
  );
}
