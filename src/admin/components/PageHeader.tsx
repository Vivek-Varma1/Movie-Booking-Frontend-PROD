import type { ReactNode } from 'react';
export function PageHeader({title, subtitle, primaryAction}: {title: string; subtitle?: string; primaryAction?: ReactNode}) {
  return <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-text-primary">{title}</h1>{subtitle && <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>}</div>{primaryAction}</div>;
}
