import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';
import { useCreateScreen } from '../lib/queries';
import { screenValidation, nextRule } from '../lib/venue-validation';
import { seatCategoryOptions, type CreateScreenRequest, type ScreenSummary } from '../types';
import { getApiErrorMessage } from '../lib/api-error';

const categoryClasses={REGULAR:'bg-cat-regular',PREMIUM:'bg-cat-premium',RECLINER:'bg-cat-recliner'} as const;
function uncoveredRanges(rows:string[]){
  const result:string[]=[];let start='';let end='';
  for(const row of rows){if(!start){start=end=row;continue;}if(row.charCodeAt(0)===end.charCodeAt(0)+1){end=row;continue;}result.push(start===end?start:`${start}-${end}`);start=end=row;}
  if(start)result.push(start===end?start:`${start}-${end}`);
  return result;
}

export function ScreenBuilder({theatreId,screens,open,onOpenChange}: {theatreId:number;screens:ScreenSummary[];open:boolean;onOpenChange:(open:boolean)=>void}){
  const create=useCreateScreen();
  const [name,setName]=useState('');
  const [lastRow,setLastRow]=useState('A');
  const [seatsPerRow,setSeatsPerRow]=useState(10);
  const [seatRules,setSeatRules]=useState<CreateScreenRequest['seatRules']>([{fromRow:'A',toRow:'A',seatCategory:'REGULAR'}]);
  const [serverError,setServerError]=useState('');
  const input={name,lastRow,seatsPerRow,seatRules};
  const validation=useMemo(()=>screenValidation(input,screens),[name,lastRow,seatsPerRow,seatRules,screens]);
  const gaps=uncoveredRanges(validation.uncovered);
  useEffect(()=>{if(open){setName('');setLastRow('A');setSeatsPerRow(10);setSeatRules([{fromRow:'A',toRow:'A',seatCategory:'REGULAR'}]);setServerError('');}},[open]);
  const updateRule=(index:number,patch:Partial<CreateScreenRequest['seatRules'][number]>)=>setSeatRules(prev=>prev.map((rule,i)=>i===index?{...rule,...patch}:rule));
  const addRule=()=>{const rule=nextRule(input);if(rule)setSeatRules(prev=>[...prev,rule]);};
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setServerError('');
    if(validation.errors.length)return;
    try{await create.mutateAsync({theatreId,input:{name:name.trim(),lastRow,seatsPerRow,seatRules}});onOpenChange(false);}
    catch(error){setServerError(getApiErrorMessage(error));}
  };
  const submitting=create.isPending;
  const rowLetters=Array.from({length:26},(_,index)=>String.fromCharCode(65+index));
  return <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1"><div className="flex items-center justify-between"><Label htmlFor="screen-name">Screen name</Label><span className="text-xs text-text-muted">{name.length}/50</span></div><Input id="screen-name" maxLength={50} value={name} disabled={submitting} onChange={event=>{setName(event.target.value);setServerError('');}} placeholder="Screen 1"/><FieldError message={validation.errors.find(error=>error==='Name is required'||error==='Maximum 50 characters'||error==='A screen with this name already exists')}/></div>
        <div className="space-y-2"><Label htmlFor="screen-last-row">Last row</Label><Input id="screen-last-row" value={lastRow} maxLength={1} disabled={submitting} onChange={event=>{setLastRow(event.target.value.replace(/[^a-z]/gi,'').slice(0,1).toUpperCase());setServerError('');}} placeholder="A"/><FieldError message={validation.errors.find(error=>error.startsWith('Last row'))}/></div>
        <div className="space-y-2"><Label htmlFor="screen-seats">Seats per row</Label><Input id="screen-seats" type="number" min={1} max={40} step={1} value={seatsPerRow} disabled={submitting} onChange={event=>{setSeatsPerRow(Number(event.target.value));setServerError('');}}/><FieldError message={validation.errors.find(error=>error.startsWith('Seats per row'))}/></div>
      </div>

      <section className="space-y-3" aria-labelledby="seat-rules-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="seat-rules-title" className="font-semibold">Seat rules</h3><p className="mt-1 text-sm text-text-secondary">Assign a category to each row range.</p></div><Button type="button" variant="outline" size="sm" onClick={addRule} disabled={submitting||!nextRule(input)}><Plus className="size-4"/>Add rule</Button></div>
        <div className="space-y-3">{seatRules.map((rule,index)=>{
          const category=seatCategoryOptions.find(option=>option.value===rule.seatCategory)!;
          const isOffender=validation.offenders.has(index);
          return <div key={`${index}-${rule.fromRow}-${rule.toRow}`} className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end ${isOffender?'border-danger bg-danger/5':'border-subtle bg-page'}`}>
            <div className="space-y-1"><Label htmlFor={`rule-from-${index}`} className="text-xs">From row</Label><select id={`rule-from-${index}`} value={rule.fromRow} disabled={submitting} onChange={event=>updateRule(index,{fromRow:event.target.value})} className="h-10 w-full rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary">{rowLetters.map(row=><option key={row}>{row}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor={`rule-to-${index}`} className="text-xs">To row</Label><select id={`rule-to-${index}`} value={rule.toRow} disabled={submitting} onChange={event=>updateRule(index,{toRow:event.target.value})} className="h-10 w-full rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary">{rowLetters.map(row=><option key={row}>{row}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor={`rule-category-${index}`} className="text-xs">Category</Label><div className="flex gap-2"><select id={`rule-category-${index}`} value={rule.seatCategory} disabled={submitting} onChange={event=>updateRule(index,{seatCategory:event.target.value as typeof rule.seatCategory})} className="h-10 min-w-0 flex-1 rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary">{seatCategoryOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="inline-flex shrink-0 items-center rounded-md border border-subtle bg-surface px-2 text-xs text-text-secondary">₹{category.displayPrice}</span></div></div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove rule ${index+1}`} disabled={submitting} onClick={()=>setSeatRules(prev=>prev.filter((_,i)=>i!==index))}><Trash2 className="size-4 text-danger"/></Button>
          </div>;
        })}</div>
        <FieldError message={validation.errors.find(error=>error==='Add at least one seat rule'||error.startsWith('Seat rules'))}/>
        {gaps.length>0&&<p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">Rows {gaps.join(', ')} will have no seats.</p>}
      </section>

      <section className="space-y-3" aria-labelledby="seat-preview-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 id="seat-preview-title" className="font-semibold">Live preview</h3><p className="mt-1 text-sm text-text-secondary">Seat layout from row A to {validation.rows.at(-1)??'—'}.</p></div><div className="flex flex-wrap gap-3 text-xs text-text-secondary">{seatCategoryOptions.map(category=><span key={category.value} className="inline-flex items-center gap-1.5"><span className={`size-3 rounded-sm ${categoryClasses[category.value]}`}/>{category.label}</span>)}</div></div>
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-subtle bg-page p-4 sm:p-6"><div className="mx-auto w-max min-w-full space-y-2">{validation.rows.map(row=>{
          const category=validation.assignments.get(row);
          return <div key={row} className="flex w-max min-h-6 items-center justify-center gap-2"><span className="w-5 text-right text-xs font-semibold text-text-secondary">{row}</span>{category?<div className="flex gap-1">{Array.from({length:Math.max(1,Math.min(40,seatsPerRow||1))},(_,seat)=> <span key={seat} title={`Row ${row}, seat ${seat+1}, ${categoryOptions(category)}`} aria-label={`Row ${row}, seat ${seat+1}`} className={`size-6 shrink-0 rounded-seat ${categoryClasses[category]}`}/>)}</div>:<span className="text-xs text-text-muted">No seats assigned</span>}<span className="w-5"/></div>;
        })}<div className="cinema-screen" role="img" aria-label="Screen at the bottom of the seating area"/><p className="-mt-14 text-center text-xs font-semibold tracking-[0.25em] text-text-secondary">SCREEN</p></div></div>
        <div className="grid gap-2 rounded-lg border border-subtle bg-surface p-4 sm:grid-cols-4">{seatCategoryOptions.map(category=><p key={category.value} className="text-sm text-text-secondary">{category.label}: <span className="font-semibold text-text-primary">{validation.counts[category.value]}</span></p>)}<p className="text-sm font-semibold text-text-primary">Total: {validation.total} seats</p></div>
      </section>
      <FieldError message={serverError}/>
    </div>
    <div className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-subtle bg-surface p-4"><Button type="button" variant="outline" disabled={submitting} onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={submitting||validation.errors.length>0}>{submitting&&<LoaderCircle className="size-4 animate-spin"/>}Create screen</Button></div>
  </form>;
}

function categoryOptions(category:CreateScreenRequest['seatRules'][number]['seatCategory']){return seatCategoryOptions.find(option=>option.value===category)?.label??category;}
