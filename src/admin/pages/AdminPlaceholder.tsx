import { useParams } from '@tanstack/react-router';
import { Film, CalendarClock, Building2, MapPin, Users, LayoutDashboard } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
const icons={Dashboard:LayoutDashboard,Movies:Film,Shows:CalendarClock,Theatres:Building2,Cities:MapPin,Users:Users,'Theatre details':Building2};
export function AdminPlaceholder({title}: {title:keyof typeof icons}) {
 const Icon=icons[title];const params=useParams({strict:false});
 return <><PageHeader title={title}/><div className="flex min-h-[360px] flex-col items-center justify-center gap-4 border-y border-subtle bg-surface px-6 text-center"><span className="flex size-16 items-center justify-center rounded-lg bg-page-muted"><Icon className="size-7 text-text-muted"/></span><h2 className="text-lg font-semibold">{title==='Dashboard' ? 'Admin dashboard' : title==='Theatre details' ? `Theatre ${'theatreId' in params ? params.theatreId : ''}` : title}</h2><p className="text-sm text-text-secondary">Coming soon</p></div></>;
}
