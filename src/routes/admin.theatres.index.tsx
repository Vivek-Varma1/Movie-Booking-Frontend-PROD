import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { appConfig } from '@/theme/theme';
const Page = lazy(() => import('@/admin/pages/AdminPlaceholder').then(m => ({default:m.AdminPlaceholder})));
export const Route = createFileRoute('/admin/theatres/')({
 head:()=>{const title=`Theatres — ${appConfig.appName} Admin`; const description='Theatres administration for the Cineverse booking service.'; return {meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex,nofollow'}]};},
 component:AdminPage,
});
function AdminPage(){return <Suspense fallback={<div role="status" className="py-12 text-center text-text-muted">Loading…</div>}><Page title="Theatres"/></Suspense>;}
