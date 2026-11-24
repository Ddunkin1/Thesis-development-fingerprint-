/** Page title block: condensed title, one line of help, actions on the right. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1 !text-brand">{eyebrow}</div>}
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide md:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.9375rem] text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  );
}
