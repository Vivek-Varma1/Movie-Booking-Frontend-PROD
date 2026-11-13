export function Placeholder({ title, detail }: { title: string; detail?: string }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="rounded-card border border-subtle bg-surface p-10">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        {detail && <p className="mt-2 text-text-secondary">{detail}</p>}
        <p className="mt-6 text-sm text-text-muted">Page coming soon.</p>
      </div>
    </section>
  );
}
