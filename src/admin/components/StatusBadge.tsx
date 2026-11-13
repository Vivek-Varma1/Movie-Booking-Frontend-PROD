import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';
const tones = {success:'bg-success/10 text-success',warning:'bg-warning/10 text-warning',danger:'bg-danger/10 text-danger',info:'bg-info/10 text-info',neutral:'bg-page-muted text-text-secondary'};
export function StatusBadge({tone='neutral', children}: {tone?: keyof typeof tones; children: ReactNode}) {return <Badge variant="outline" className={`gap-1.5 border-transparent ${tones[tone]}`}><span className="size-1.5 rounded-full bg-current" />{children}</Badge>;}
