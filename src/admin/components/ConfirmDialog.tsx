import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function ConfirmDialog({open,onOpenChange,title,description,confirmName,loading,onConfirm,error}: {open:boolean;onOpenChange:(open:boolean)=>void;title:string;description?:string;confirmName?:string;loading?:boolean;onConfirm:()=>void;error?:string}) {
  const [value,setValue] = useState(''); useEffect(()=>{if(open)setValue('');},[open]);
  return <Dialog open={open} onOpenChange={v=>{if(!loading)onOpenChange(v);}}><DialogContent onEscapeKeyDown={e=>{if(loading)e.preventDefault();}} onInteractOutside={e=>{if(loading)e.preventDefault();}}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description ?? 'This action cannot be undone.'}</DialogDescription></DialogHeader>{confirmName && <div><label htmlFor="confirm-name" className="mb-2 block text-sm">Type “{confirmName}” to confirm</label><Input id="confirm-name" value={value} onChange={e=>setValue(e.target.value)} disabled={loading}/></div>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}<DialogFooter><Button variant="outline" disabled={loading} onClick={()=>onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={loading || (!!confirmName && value!==confirmName)} onClick={onConfirm}>{loading && <LoaderCircle className="size-4 animate-spin"/>}Confirm</Button></DialogFooter></DialogContent></Dialog>;
}
