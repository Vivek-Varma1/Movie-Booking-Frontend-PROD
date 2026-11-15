import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from './FormDialog';
import { FieldError } from './FieldError';
import { useCreateTheatre, useUpdateTheatre } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import { theatreErrors } from '../lib/venue-validation';
import type { CityResponse, TheatreSummary } from '../types';

export function TheatreFormDialog({open,onOpenChange,cities,citiesLoading,theatre,onSaved}: {open:boolean;onOpenChange:(open:boolean)=>void;cities:CityResponse[];citiesLoading?:boolean;theatre?:TheatreSummary|null;onSaved?:()=>void}) {
  const create = useCreateTheatre();
  const update = useUpdateTheatre();
  const mutation = theatre ? update : create;
  const [name,setName] = useState('');
  const [address,setAddress] = useState('');
  const [cityId,setCityId] = useState('');
  const [errors,setErrors] = useState<{name?:string|undefined;address?:string|undefined;cityId?:string|undefined;form?:string|undefined}>({});
  useEffect(()=>{if(open){setName(theatre?.name ?? '');setAddress(theatre?.address ?? '');setCityId(theatre ? String(theatre.cityId) : '');setErrors({});}},[open,theatre]);
  const submitting = mutation.isPending;
  const submit = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input={name:name.trim(),address:address.trim(),cityId:Number(cityId)};
    const next=theatreErrors(input);
    if(!cities.some(city=>city.cityId===input.cityId)) next.cityId='Select a city';
    if(next.name||next.address||next.cityId){setErrors(next);return;}
    setErrors({});
    try {
      if(theatre) await update.mutateAsync({id:theatre.id,input});
      else await create.mutateAsync(input);
      onOpenChange(false);onSaved?.();
    } catch(error) { setErrors({form:getApiErrorMessage(error)}); }
  };
  return <FormDialog open={open} onOpenChange={onOpenChange} title={theatre?'Edit theatre':'Add theatre'} description={theatre?'Update theatre details.':'Add a theatre and assign it to a city.'} submitting={submitting} onSubmit={submit}>
    <div className="space-y-5">
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="theatre-name">Name</Label><span className="text-xs text-text-muted">{name.length}/100</span></div><Input id="theatre-name" maxLength={100} value={name} disabled={submitting} aria-invalid={!!errors.name} onChange={event=>{setName(event.target.value);setErrors(prev=>({...prev,name:undefined,form:undefined}));}}/><FieldError message={errors.name}/></div>
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="theatre-address">Address</Label><span className="text-xs text-text-muted">{address.length}/255</span></div><Textarea id="theatre-address" maxLength={255} rows={4} value={address} disabled={submitting} aria-invalid={!!errors.address} onChange={event=>{setAddress(event.target.value);setErrors(prev=>({...prev,address:undefined,form:undefined}));}}/><FieldError message={errors.address}/></div>
      <div className="space-y-2"><Label htmlFor="theatre-city">City</Label>{cities.length===0 && !citiesLoading ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-subtle bg-page-muted p-4"><div className="flex items-center gap-3 text-sm text-text-secondary"><Building2 className="size-5 shrink-0"/><span>Add a city before creating a theatre.</span></div><Button asChild variant="outline" size="sm"><Link to="/admin/cities">Add city</Link></Button></div> : <select id="theatre-city" value={cityId} disabled={submitting||citiesLoading} aria-invalid={!!errors.cityId} onChange={event=>{setCityId(event.target.value);setErrors(prev=>({...prev,cityId:undefined,form:undefined}));}} className="h-10 w-full rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="">Select a city</option>{cities.map(city=><option key={city.cityId} value={city.cityId}>{city.name}</option>)}</select>}<FieldError message={errors.cityId}/></div>
      <FieldError message={errors.form}/>
    </div>
  </FormDialog>;
}
