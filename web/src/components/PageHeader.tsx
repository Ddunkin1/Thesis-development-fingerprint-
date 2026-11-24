/** Page title block from the design: small indigo eyebrow, huge condensed title, one line of help, actions on the right. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2 !text-brand">{eyebrow}</div>}
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-wide md:text-6xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  );
}
