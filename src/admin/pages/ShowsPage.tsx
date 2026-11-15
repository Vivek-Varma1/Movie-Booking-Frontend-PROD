import { useMemo, useState, type FormEvent } from 'react';
import { Film, Plus, Theater } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { FormDialog } from '../components/FormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { FieldError } from '../components/FieldError';
import { useAdminMoviesQuery, useAdminShowsQuery, useAdminTheatresQuery, useAdminTheatreScreensQuery, useDeleteShow } from '../lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../lib/queryKeys';
import { getApiErrorMessage } from '../lib/api-error';
import { showsApi } from '../services/shows';
import { languageOptions, showSlotOptions, showStatusOptions } from '../types/enums';
import type { CreateShowRequest, MovieResponse, ShowResponse, ShowSlot, TheatreSummary } from '../types';

type Failure = {date:string;slot:ShowSlot;message:string;request:CreateShowRequest};
type ShowOutcome = {created:number;failures:Failure[]};
const toneByStatus = Object.fromEntries(showStatusOptions.map(option=>[option.value,option.tone])) as Record<ShowResponse['status'],'neutral'|'success'|'warning'|'info'|'danger'>;
const labelFor=(options:readonly {value:string;label:string}[],value:string)=>options.find(option=>option.value===value)?.label??value;
const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today=()=>localDate(new Date());
const addDays=(date:string,days:number)=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+days);return localDate(value);};
const dateLabel=(value:string)=>{const date=new Date(value.length===10?`${value}T12:00:00`:value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(date);};
const timeLabel=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date);};
const priceLabel=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
const movieLang=(movie:MovieResponse)=>labelFor(languageOptions,movie.language);

export function AddShowsDialog({open,onOpenChange,movies,theatres,shows}:{open:boolean;onOpenChange:(open:boolean)=>void;movies:MovieResponse[];theatres:TheatreSummary[];shows:ShowResponse[]}) {
  const client=useQueryClient();
  const [movieId,setMovieId]=useState('');const [theatreId,setTheatreId]=useState('');const [screenId,setScreenId]=useState('');
  const [dateMode,setDateMode]=useState<'single'|'range'>('single');const [startDate,setStartDate]=useState('');const [endDate,setEndDate]=useState('');const [slots,setSlots]=useState<ShowSlot[]>([]);
  const [outcome,setOutcome]=useState<ShowOutcome|null>(null);const [progress,setProgress]=useState(0);const [submitting,setSubmitting]=useState(false);const [formError,setFormError]=useState('');
  const parsedTheatreId=Number(theatreId);const screensQuery=useAdminTheatreScreensQuery(parsedTheatreId);
  const movie=movies.find(item=>String(item.id)===movieId);
  const dates=useMemo(()=>{if(!startDate)return[];if(dateMode==='single')return[startDate];if(!endDate)return[];const first=new Date(`${startDate}T12:00:00`);const last=new Date(`${endDate}T12:00:00`);if(last<first)return[];const span=Math.round((last.getTime()-first.getTime())/86400000);if(span>30)return[];return Array.from({length:span+1},(_,i)=>addDays(startDate,i));},[dateMode,startDate,endDate]);
  const exists=(date:string,slot:ShowSlot)=>shows.some(show=>show.screenId===Number(screenId)&&show.showSlot===slot&&localDate(new Date(show.startTime))===date);
  const candidates=useMemo(()=>dates.flatMap(date=>slots.filter(slot=>!shows.some(show=>show.screenId===Number(screenId)&&show.showSlot===slot&&localDate(new Date(show.startTime))===date)).map(slot=>({date,slot,request:{movieId:Number(movieId),screenId:Number(screenId),showDate:date,showSlot:slot}}))),[dates,slots,shows,movieId,screenId]);
  const duplicateCount=dates.reduce((count,date)=>count+slots.filter(slot=>exists(date,slot)).length,0);
  const dateLimit=startDate?addDays(startDate,30):undefined;
  const reset=()=>{setMovieId('');setTheatreId('');setScreenId('');setDateMode('single');setStartDate('');setEndDate('');setSlots([]);setOutcome(null);setProgress(0);setFormError('');};
  const close=(next:boolean)=>{if(!next&&!submitting){onOpenChange(false);reset();}else if(next)onOpenChange(true);};
  const run=async(requests:Failure[]|{date:string;slot:ShowSlot;request:CreateShowRequest}[],alreadyCreated=0)=>{
    setSubmitting(true);setFormError('');let created=alreadyCreated;const failures:Failure[]=[];setProgress(0);
    for(let index=0;index<requests.length;index+=1){const item=requests[index]!;try{await showsApi.create(item.request);created+=1;}catch(error){const message=getApiErrorMessage(error);failures.push({...item,message});toast.error(message);}setProgress(Math.round(((index+1)/requests.length)*100));}
    setOutcome({created,failures});setSubmitting(false);await client.invalidateQueries({queryKey:adminKeys.shows()});
  };
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!movieId||!movie){setFormError('Select a movie');return;}if(!theatreId){setFormError('Select a theatre');return;}if(!screenId){setFormError('Select a screen');return;}if(!dates.length){setFormError('Choose a valid date or date range');return;}if(!slots.length){setFormError('Choose at least one slot');return;}if(!candidates.length){setFormError('Every selected date and slot is already scheduled for this screen.');return;}setOutcome(null);void run(candidates);};
  const retry=()=>{if(outcome?.failures.length)void run(outcome.failures,outcome.created);};
  const selectClass='h-10 w-full rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';
  return <FormDialog open={open} onOpenChange={close} title="Add shows" description="Create shows across dates and time slots in one batch." submitting={submitting} submitDisabled={outcome?false:!movieId||!theatreId||!screenId||!dates.length||!slots.length||!candidates.length} submitLabel={outcome?'Done':`Create ${candidates.length} shows`} onSubmit={outcome?(event)=>{event.preventDefault();close(false);}:submit} className="sm:max-w-3xl">
    {outcome ? <div className="space-y-5"><div className="rounded-lg border border-subtle bg-page-muted p-4"><p className="text-lg font-semibold text-text-primary">{outcome.created} {outcome.created===1?'show':'shows'} created</p><p className="mt-1 text-sm text-text-secondary">{outcome.failures.length} failed</p></div>{outcome.failures.length>0&&<div className="space-y-3"><h3 className="font-semibold">Failed shows</h3><ul className="space-y-2">{outcome.failures.map((failure,index)=><li key={`${failure.date}-${failure.slot}-${index}`} className="rounded-md border border-subtle p-3 text-sm"><p className="font-medium">{dateLabel(failure.date)} · {labelFor(showSlotOptions,failure.slot)}</p><p className="mt-1 text-text-secondary">{failure.message}</p></li>)}</ul><Button type="button" variant="outline" disabled={submitting} onClick={retry}>Retry failed</Button></div>}</div> : <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="show-movie">Movie</Label><select id="show-movie" className={selectClass} value={movieId} disabled={submitting} onChange={event=>setMovieId(event.target.value)}><option value="">Select a movie</option>{movies.map(item=><option key={item.id} value={item.id}>{item.movieName} · {movieLang(item)}</option>)}</select>{movie&&<div className="flex items-center gap-3 rounded-md border border-subtle bg-page-muted p-2">{movie.posterUrl?<img src={movie.posterUrl} alt="" className="h-14 w-10 rounded object-cover"/>:<div className="flex h-14 w-10 items-center justify-center rounded bg-surface text-text-muted"><Film className="size-5"/></div>}<div><p className="font-medium text-text-primary">{movie.movieName}</p><p className="text-sm text-text-secondary">{movieLang(movie)}</p>{movie.movieStatus==='ENDED'&&<Badge variant="outline" className="mt-1 border-warning text-warning">Ended</Badge>}</div></div>}</div>
        <div className="space-y-2"><Label htmlFor="show-theatre">Theatre</Label><select id="show-theatre" className={selectClass} value={theatreId} disabled={submitting} onChange={event=>{setTheatreId(event.target.value);setScreenId('');}}><option value="">Select a theatre</option>{theatres.map(theatre=><option key={theatre.id} value={theatre.id}>{theatre.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="show-screen">Screen</Label><select id="show-screen" className={selectClass} value={screenId} disabled={!theatreId||screensQuery.isLoading||submitting} onChange={event=>setScreenId(event.target.value)}><option value="">{screensQuery.isLoading?'Loading screens…':'Select a screen'}</option>{(screensQuery.data??[]).map(screen=><option key={screen.id} value={screen.id}>{screen.name}</option>)}</select>{screensQuery.isError&&<p role="alert" className="text-sm text-danger">{getApiErrorMessage(screensQuery.error)}</p>}</div>
      </div>
      {movie&&movie.durationInMinutes>180&&<div role="status" className="rounded-md border border-warning bg-warning/10 p-3 text-sm text-text-primary">Slots are 3 hours apart, so this show will overlap the next slot.</div>}
      <div className="space-y-3"><Label>Dates</Label><div className="flex gap-2"><Button type="button" size="sm" variant={dateMode==='single'?'default':'outline'} onClick={()=>{setDateMode('single');setEndDate('');}}>Single date</Button><Button type="button" size="sm" variant={dateMode==='range'?'default':'outline'} onClick={()=>setDateMode('range')}>Date range</Button></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="show-start-date">{dateMode==='single'?'Show date':'Start date'}</Label><Input id="show-start-date" type="date" min={today()} max={dateMode==='range'?dateLimit:undefined} value={startDate} disabled={submitting} onChange={event=>{setStartDate(event.target.value);if(endDate&&event.target.value>endDate)setEndDate('');}}/></div>{dateMode==='range'&&<div className="space-y-1"><Label htmlFor="show-end-date">End date</Label><Input id="show-end-date" type="date" min={startDate||today()} max={dateLimit} value={endDate} disabled={submitting||!startDate} onChange={event=>setEndDate(event.target.value)}/></div>}</div>{dateMode==='range'&&startDate&&<p className="text-xs text-text-muted">Choose up to 31 days, including the start date.</p>}</div>
      <div className="space-y-3"><Label>Time slots</Label><div className="grid gap-2 sm:grid-cols-2">{showSlotOptions.map(slot=><label key={slot.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-subtle p-3"><Checkbox checked={slots.includes(slot.value)} disabled={submitting} onCheckedChange={checked=>setSlots(current=>checked?[...current,slot.value]:current.filter(value=>value!==slot.value))}/><span className="flex-1 text-sm text-text-primary">{slot.label}</span><span className="text-sm text-text-secondary">{slot.time}</span></label>)}</div></div>
      {dates.length>0&&slots.length>0&&<div className="space-y-3 rounded-lg border border-subtle bg-page-muted p-4"><p className="font-medium text-text-primary">This will create {candidates.length} {candidates.length===1?'show':'shows'} ({dates.length} {dates.length===1?'date':'dates'} x {slots.length} {slots.length===1?'slot':'slots'})</p>{duplicateCount>0&&<ul className="space-y-1 text-sm text-text-secondary">{dates.flatMap(date=>slots.filter(slot=>exists(date,slot)).map(slot=><li key={`${date}-${slot}`}>{dateLabel(date)} · {labelFor(showSlotOptions,slot)} — already scheduled</li>))}</ul>}{submitting&&<div className="space-y-2"><Progress value={progress} className="h-1"/><p className="text-xs text-text-secondary">Creating shows… {progress}%</p></div>}</div>}
      <FieldError message={formError}/>
    </div>}
  </FormDialog>;
}

export default function ShowsPage(){
  const showsQuery=useAdminShowsQuery();const moviesQuery=useAdminMoviesQuery();const theatresQuery=useAdminTheatresQuery();const remove=useDeleteShow();
  const [addOpen,setAddOpen]=useState(false);const [deleting,setDeleting]=useState<ShowResponse|null>(null);const [deleteError,setDeleteError]=useState('');
  const [movieFilter,setMovieFilter]=useState('');const [theatreFilter,setTheatreFilter]=useState('');const [dateFilter,setDateFilter]=useState('');const [statusFilter,setStatusFilter]=useState('');
  const shows=showsQuery.data??[];const movies=moviesQuery.data??[];const theatres=theatresQuery.data??[];
  const filtered=useMemo(()=>shows.filter(show=>(!movieFilter||String(show.movieId)===movieFilter)&&(!theatreFilter||String(show.theatreId)===theatreFilter)&&(!dateFilter||localDate(new Date(show.startTime))===dateFilter)&&(!statusFilter||show.status===statusFilter)),[shows,movieFilter,theatreFilter,dateFilter,statusFilter]);
  const columns:Column<ShowResponse>[]=[
    {id:'movieName',header:'Movie',accessor:show=>show.movieName},
    {id:'theatreScreen',header:'Theatre / Screen',accessor:show=>`${show.theatreName} ${show.screenName}`},
    {id:'showDate',header:'Date',accessor:show=>localDate(new Date(show.startTime)),render:show=>dateLabel(localDate(new Date(show.startTime)))},
    {id:'startTime',header:'Time',accessor:show=>show.startTime,render:show=><span className="whitespace-nowrap">{timeLabel(show.startTime)} – {timeLabel(show.endTime)}</span>},
    {id:'showSlot',header:'Slot',accessor:show=>show.showSlot,render:show=>labelFor(showSlotOptions,show.showSlot)},
    {id:'seats',header:'Seats',accessor:show=>`${show.availableSeats}/${show.totalSeats}`,render:show=><div className="min-w-24 space-y-1"><span className="text-sm">{show.availableSeats}/{show.totalSeats}</span><Progress value={show.totalSeats>0?(show.availableSeats/show.totalSeats)*100:0} className="h-1"/></div>},
    {id:'minimumPrice',header:'Min price',accessor:show=>show.minimumPrice,render:show=>priceLabel(show.minimumPrice)},
    {id:'status',header:'Status',accessor:show=>show.status,render:show=><StatusBadge tone={toneByStatus[show.status]}>{labelFor(showStatusOptions,show.status)}</StatusBadge>},
  ];
  const deleteShow=async()=>{if(!deleting)return;setDeleteError('');try{await remove.mutateAsync(deleting.showId);setDeleting(null);}catch(error){setDeleteError(getApiErrorMessage(error));}};
  const selectClass='h-10 min-w-32 rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary';
  return <><PageHeader title="Shows" subtitle="Schedule showtimes across movies, theatres and screens." primaryAction={<Button onClick={()=>setAddOpen(true)}><Plus className="size-4"/>Add shows</Button>}/>
    <DataTable rows={filtered} columns={columns} rowKey={show=>show.showId} loading={showsQuery.isLoading} error={showsQuery.error?getApiErrorMessage(showsQuery.error):undefined} onRetry={()=>void showsQuery.refetch()} searchColumns={[columns[0]!,columns[1]!]} initialSort={{id:'startTime',desc:false}} emptyTitle="No shows yet" emptyIcon={<Theater className="size-9 text-text-muted"/>} emptyAction={<Button onClick={()=>setAddOpen(true)}><Plus className="size-4"/>Add shows</Button>} rowClassName={show=>new Date(show.startTime).getTime()<Date.now()?'text-text-muted opacity-60':undefined}
      filterSlot={<><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Movie</span><select aria-label="Filter shows by movie" className={selectClass} value={movieFilter} onChange={event=>setMovieFilter(event.target.value)}><option value="">All movies</option>{movies.map(movie=><option key={movie.id} value={movie.id}>{movie.movieName}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Theatre</span><select aria-label="Filter shows by theatre" className={selectClass} value={theatreFilter} onChange={event=>setTheatreFilter(event.target.value)}><option value="">All theatres</option>{theatres.map(theatre=><option key={theatre.id} value={theatre.id}>{theatre.name}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Date</span><Input aria-label="Filter shows by date" className="w-40" type="date" value={dateFilter} onChange={event=>setDateFilter(event.target.value)}/></label><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Status</span><select aria-label="Filter shows by status" className={selectClass} value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="">All statuses</option>{showStatusOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></>}
      actions={show=>[{label:'Delete',destructive:true,onSelect:()=>{setDeleting(show);setDeleteError('');}}]}/>
    <AddShowsDialog open={addOpen} onOpenChange={setAddOpen} movies={movies} theatres={theatres} shows={shows}/>
    <ConfirmDialog open={!!deleting} onOpenChange={open=>{if(!open&&!remove.isPending){setDeleting(null);setDeleteError('');}}} title="Delete show?" description={`Delete ${deleting?.movieName??'this show'} at ${deleting?.theatreName??'the selected theatre'}?`} loading={remove.isPending} onConfirm={deleteShow} error={deleteError}/>
  </>;
}
