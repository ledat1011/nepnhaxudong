type SectionHeadingProps = {
  id: string;
  title: string;
  /** One short line under the title. */
  intro?: string;
};

/** Section title; `id` is the anchor target for the header menu. */
export function SectionHeading({ id, title, intro }: SectionHeadingProps) {
  return (
    <div data-reveal className="mb-8">
      <h2 id={id} className="scroll-mt-20 font-display text-3xl text-earth md:text-4xl">
        {title}
      </h2>
      {intro !== undefined && <p className="mt-3 max-w-prose text-lg font-medium text-coat">{intro}</p>}
    </div>
  );
}
