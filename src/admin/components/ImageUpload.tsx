import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError } from './FieldError';
export function validateImage(file: Pick<File,'type'|'size'>, accepted: string[], maxBytes: number) {return !accepted.includes(file.type) ? 'Unsupported file format' : file.size > maxBytes ? 'File too large' : '';}
export function ImageUpload({value,onChange,maxBytes,accepted=['image/jpeg','image/png','image/webp'],disabled=false}: {value:File|null;onChange:(file:File|null)=>void;maxBytes:number;accepted?:string[];disabled?:boolean}) {
 const [preview,setPreview]=useState(''); const [error,setError]=useState('');const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(!value){setPreview('');return;} const url=URL.createObjectURL(value);setPreview(url);return ()=>URL.revokeObjectURL(url);},[value]);
 const select=(file?:File)=>{if(!file || disabled)return;const message=validateImage(file,accepted,maxBytes);setError(message);if(!message)onChange(file);};
 return <div><div className="relative flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-subtle bg-page-muted p-4" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();select(e.dataTransfer.files[0]);}}>{preview ? <><img src={preview} alt="Upload preview" className="max-h-48 max-w-full object-contain"/><Button type="button" variant="outline" size="icon" aria-label="Remove image" disabled={disabled} className="absolute right-2 top-2" onClick={()=>{onChange(null);setError('');}}><X className="size-4"/></Button></> : <ImagePlus className="size-8 text-text-muted"/>}<Button type="button" variant="outline" disabled={disabled} onClick={()=>input.current?.click()}>{value ? 'Replace image' : 'Choose image'}</Button><input ref={input} type="file" aria-label="Upload image" accept={accepted.join(',')} disabled={disabled} className="sr-only" onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/></div><FieldError message={error}/></div>;
}
