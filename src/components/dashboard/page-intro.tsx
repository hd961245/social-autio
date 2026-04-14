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
    <section className="glass-panel fade-in-up relative overflow-hidden rounded-[2rem] border border-[var(--border)] px-6 py-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--muted)]">{eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-none md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </section>
  );
}
