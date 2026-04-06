export function PageIntro({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="glass-panel fade-in-up rounded-[2rem] border border-[var(--border)] px-6 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--muted)]">{eyebrow}</p>
          <h1 className="mt-2 text-4xl font-semibold leading-none">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </section>
  );
}
