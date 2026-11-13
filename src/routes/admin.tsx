import { lazy, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
const Layout = lazy(() => import('@/admin/components/AdminLayout').then(m => ({default:m.AdminLayout})));
export const Route = createFileRoute('/admin')({ssr:false, component:AdminRoute});
function AdminRoute(){return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-page" role="status" aria-label="Loading admin"><LoaderCircle className="size-8 animate-spin text-text-muted"/></div>}><Layout/></Suspense>;}
