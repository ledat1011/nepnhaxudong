type SectionHeadingProps = {
  id: string;
  title: string;
  kicker?: string;
};

/** Section title; `id` is the anchor target for the header menu. */
export function SectionHeading({ id, title, kicker }: SectionHeadingProps) {
  return (
    <div className="mb-8">
      {kicker && (
        <p className="mb-1 text-sm font-bold uppercase tracking-wide text-coat">{kicker}</p>
      )}
      <h2 id={id} className="scroll-mt-20 font-display text-3xl text-earth md:text-4xl">
        {title}
      </h2>
    </div>
  );
}
