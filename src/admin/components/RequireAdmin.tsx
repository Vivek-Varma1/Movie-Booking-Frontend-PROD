import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { isAdmin } from '../lib/auth';
// This gate is UX only; backend @PreAuthorize is the real security boundary.
export function RequireAdmin({children}: {children:ReactNode}) {
 const auth=useAuth();const router=useRouter();const prompted=useRef(false);const denied=useRef(false);
 useEffect(()=>{if(auth.status==='loading')return;if(auth.status==='anonymous' && !prompted.current){prompted.current=true;auth.openAuthModal({onSuccess:()=>{void router.invalidate();}});}if(auth.status==='authenticated' && !isAdmin(auth.user) && !denied.current){denied.current=true;toast.error("You don't have access to the admin area");void router.navigate({to:'/',replace:true});}},[auth.status,auth.user,auth.openAuthModal,router]);
 if(auth.status==='loading')return <div className="flex min-h-screen items-center justify-center bg-page" role="status" aria-label="Loading session"><LoaderCircle className="size-8 animate-spin text-text-muted"/></div>;
 if(auth.status==='anonymous')return <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-page p-6"><LockKeyhole className="size-10 text-text-muted"/><h1 className="text-xl font-semibold">Sign in to continue</h1><Button onClick={()=>auth.openAuthModal({onSuccess:()=>{void router.invalidate();}})}>Sign in</Button><Button variant="link" onClick={()=>{void router.navigate({to:'/'});}}>Back to site</Button></div>;
 return isAdmin(auth.user) ? children : null;
}
