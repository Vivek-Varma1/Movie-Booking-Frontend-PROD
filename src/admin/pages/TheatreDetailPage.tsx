import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Building2, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '../components/PageHeader';
import { TheatreFormDialog } from '../components/TheatreFormDialog';
import { ScreenBuilder } from '../components/ScreenBuilder';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAdminCitiesQuery, useAdminTheatreQuery, useDeleteScreen } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import type { ScreenSummary } from '../types';

export default function TheatreDetailPage(){
  const {theatreId:rawId}=useParams({from:'/admin/theatres/$theatreId'});
  const theatreId=Number(rawId);
  const theatreQuery=useAdminTheatreQuery(theatreId);
  const citiesQuery=useAdminCitiesQuery();
  const deleteScreen=useDeleteScreen();
  const theatre=theatreQuery.data;
  const [editOpen,setEditOpen]=useState(false);
  const [builderOpen,setBuilderOpen]=useState(false);
  const [deleting,setDeleting]=useState<ScreenSummary|null>(null);
  const [deleteError,setDeleteError]=useState('');
  const removeScreen=async()=>{
    if(!theatre||!deleting)return;
    setDeleteError('');
    try{await deleteScreen.mutateAsync({theatreId,screenId:deleting.id});setDeleting(null);}
    catch(error){setDeleteError(getApiErrorMessage(error));}
  };
  if(theatreQuery.isLoading)return <div className="space-y-5" role="status" aria-label="Loading theatre"><Skeleton className="h-8 w-56"/><Skeleton className="h-36 w-full"/><Skeleton className="h-52 w-full"/></div>;
  if(!theatre)return <><PageHeader title="Theatre not found" subtitle={theatreQuery.error?getApiErrorMessage(theatreQuery.error):'This theatre could not be found.'} primaryAction={<Button asChild variant="outline"><Link to="/admin/theatres"><ArrowLeft className="size-4"/>Back to theatres</Link></Button>}/></>;
  const columns=[
    {id:'name',header:'Name',accessor:(screen:ScreenSummary)=>screen.name},
    {id:'totalSeats',header:'Total seats',accessor:(screen:ScreenSummary)=>screen.totalSeats},
  ];
  return <>
    <section className="mb-8 rounded-xl border border-subtle bg-surface p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost" className="px-0 text-text-secondary"><Link to="/admin/theatres"><ArrowLeft className="size-4"/>Back to theatres</Link></Button><Button onClick={()=>setEditOpen(true)}>Edit theatre</Button></div><div className="flex flex-wrap items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-page-muted"><Building2 className="size-6 text-text-secondary"/></span><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold text-text-primary">{theatre.name}</h1><p className="mt-2 text-sm text-text-secondary">{theatre.address}</p><p className="mt-3 flex items-center gap-2 text-sm text-text-secondary"><MapPin className="size-4"/>{theatre.cityName}</p></div></div></section>
    <PageHeader title="Screens" subtitle="Configure rows and seat categories for this theatre."
      primaryAction={<Button onClick={()=>setBuilderOpen(true)}><Plus className="size-4"/>Add screen</Button>}/>
    <div className="overflow-hidden rounded-lg border border-subtle bg-surface"><Table><TableHeader><TableRow>{columns.map(column=><TableHead key={column.id}>{column.header}</TableHead>)}<TableHead className="w-32 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{theatre.screens.length?theatre.screens.map(screen=><TableRow key={screen.id}><TableCell className="font-medium">{screen.name}</TableCell><TableCell>{screen.totalSeats}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-danger" onClick={()=>{setDeleting(screen);setDeleteError('');}}>Delete</Button></TableCell></TableRow>):<TableRow><TableCell colSpan={3}><div className="flex min-h-48 flex-col items-center justify-center gap-3 py-8 text-center"><Building2 className="size-8 text-text-muted"/><p className="font-medium">No screens yet</p><Button variant="outline" size="sm" onClick={()=>setBuilderOpen(true)}><Plus className="size-4"/>Add screen</Button></div></TableCell></TableRow>}</TableBody></Table></div>
    <p className="mt-3 text-sm text-text-secondary">Screens can&apos;t be edited after creation. Delete and recreate instead.</p>
    <TheatreFormDialog open={editOpen} onOpenChange={setEditOpen} cities={citiesQuery.data??[]} citiesLoading={citiesQuery.isLoading} theatre={theatre}/>
    <Sheet open={builderOpen} onOpenChange={setBuilderOpen}><SheetContent side="right" className="flex h-full w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"><div className="shrink-0 border-b border-subtle p-6"><SheetTitle>Add screen</SheetTitle><SheetDescription className="mt-2">Create a screen and assign seat categories by row.</SheetDescription></div><ScreenBuilder theatreId={theatreId} screens={theatre.screens} open={builderOpen} onOpenChange={setBuilderOpen}/></SheetContent></Sheet>
    <ConfirmDialog open={!!deleting} onOpenChange={open=>{if(!open&&!deleteScreen.isPending){setDeleting(null);setDeleteError('');}}} title={`Delete ${deleting?.name??'screen'}?`} description="This will permanently delete the screen and its seats." loading={deleteScreen.isPending} onConfirm={removeScreen} error={deleteError}/>
  </>;
}
