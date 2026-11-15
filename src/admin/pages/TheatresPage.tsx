import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { TheatreFormDialog } from '../components/TheatreFormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAdminCitiesQuery, useAdminTheatresQuery, useDeleteTheatre } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import type { TheatreSummary } from '../types';

export default function TheatresPage(){
  const navigate=useNavigate();
  const theatresQuery=useAdminTheatresQuery();
  const citiesQuery=useAdminCitiesQuery();
  const remove=useDeleteTheatre();
  const [cityFilter,setCityFilter]=useState('');
  const [formOpen,setFormOpen]=useState(false);
  const [editing,setEditing]=useState<TheatreSummary|null>(null);
  const [deleting,setDeleting]=useState<TheatreSummary|null>(null);
  const [deleteError,setDeleteError]=useState('');
  const cities=citiesQuery.data??[];
  const cityNames=useMemo(()=>new Map(cities.map(city=>[city.cityId,city.name])),[cities]);
  const theatres=theatresQuery.data??[];
  const filtered=cityFilter?theatres.filter(theatre=>String(theatre.cityId)===cityFilter):theatres;
  const columns:Column<TheatreSummary>[]=[
    {id:'name',header:'Name',accessor:row=>row.name},
    {id:'address',header:'Address',accessor:row=>row.address},
    {id:'city',header:'City',accessor:row=>cityNames.get(row.cityId)??row.cityName},
  ];
  const openAdd=()=>{setEditing(null);setFormOpen(true);};
  const openEdit=(theatre:TheatreSummary)=>{setEditing(theatre);setFormOpen(true);};
  const deleteTheatre=async()=>{
    if(!deleting)return;
    setDeleteError('');
    try{await remove.mutateAsync(deleting.id);setDeleting(null);}
    catch(error){setDeleteError(getApiErrorMessage(error));}
  };
  return <>
    <PageHeader title="Theatres" subtitle="Manage theatre locations and their screens."
      primaryAction={<Button onClick={openAdd}><Plus className="size-4"/>Add theatre</Button>}/>
    <DataTable rows={filtered} columns={columns} rowKey={row=>row.id} loading={theatresQuery.isLoading} error={theatresQuery.error?getApiErrorMessage(theatresQuery.error):undefined} onRetry={()=>void theatresQuery.refetch()}
      searchColumns={columns} emptyTitle="No theatres yet" emptyIcon={<Building2 className="size-9 text-text-muted"/>}
      emptyAction={<Button onClick={openAdd}><Plus className="size-4"/>Add theatre</Button>}
      filterSlot={<label className="flex items-center gap-2 text-sm text-text-secondary"><span>City</span><select aria-label="Filter theatres by city" value={cityFilter} onChange={event=>setCityFilter(event.target.value)} className="h-10 min-w-36 rounded-md border border-subtle bg-surface px-3 text-text-primary"><option value="">All cities</option>{cities.map(city=><option key={city.cityId} value={city.cityId}>{city.name}</option>)}</select></label>}
      onRowClick={row=>void navigate({to:'/admin/theatres/$theatreId',params:{theatreId:String(row.id)}})}
      actions={row=>[
        {label:'Edit',onSelect:()=>openEdit(row)},
        {label:'Delete',destructive:true,onSelect:()=>{setDeleting(row);setDeleteError('');}},
      ]}/>
    <TheatreFormDialog open={formOpen} onOpenChange={open=>{setFormOpen(open);if(!open)setEditing(null);}} cities={cities} citiesLoading={citiesQuery.isLoading} theatre={editing}/>
    <ConfirmDialog open={!!deleting} onOpenChange={open=>{if(!open&&!remove.isPending){setDeleting(null);setDeleteError('');}}}
      title={`Delete ${deleting?.name??'theatre'}?`} description="All screens and seats of this theatre will also be deleted."
      loading={remove.isPending} onConfirm={deleteTheatre} error={deleteError}/>
  </>;
}
