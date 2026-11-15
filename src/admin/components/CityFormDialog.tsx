import { useEffect, useState, type FormEvent } from 'react';
import { FormDialog } from './FormDialog';
import { FieldError } from './FieldError';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCreateCity, useUpdateCity } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import type { CityResponse } from '../types';

export function CityFormDialog({open,onOpenChange,cities,city=null}:{open:boolean;onOpenChange:(open:boolean)=>void;cities:CityResponse[];city?:CityResponse|null}) {
  const create=useCreateCity();const update=useUpdateCity();const [name,setName]=useState('');const [error,setError]=useState('');
  const mutationPending=create.isPending||update.isPending;
  useEffect(()=>{if(open){setName(city?.name??'');setError('');}},[open,city]);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const value=name.trim();
    if(!value){setError('Name is required');return;}
    if(cities.some(item=>item.name.trim().toLocaleLowerCase()===value.toLocaleLowerCase()&&item.cityId!==city?.cityId)){setError('A city with this name already exists');return;}
    setError('');
    try{if(city)await update.mutateAsync({id:city.cityId,input:{name:value}});else await create.mutateAsync({name:value});onOpenChange(false);}
    catch(reason){setError(getApiErrorMessage(reason));}
  };
  return <FormDialog open={open} onOpenChange={onOpenChange} title={city?'Edit city':'Add city'} description={city?'Update the city name.':'Add a city to the booking experience.'} submitting={mutationPending} onSubmit={submit}>
    <div className="space-y-2"><Label htmlFor="admin-city-name">City name</Label><Input id="admin-city-name" autoFocus maxLength={100} value={name} disabled={mutationPending} aria-invalid={!!error} onChange={event=>{setName(event.target.value);setError('');}} placeholder="e.g. Hyderabad"/><FieldError message={error}/></div>
  </FormDialog>;
}
