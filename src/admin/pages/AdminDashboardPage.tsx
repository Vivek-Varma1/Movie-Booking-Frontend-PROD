import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import { Building2, CalendarClock, Check, Film, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { TheatreFormDialog } from '../components/TheatreFormDialog';
import { CityFormDialog } from '../components/CityFormDialog';
import { MovieFormDialog } from './MoviesPage';
import { AddShowsDialog } from './ShowsPage';
import { adminTheatreQuery } from '../lib/queries';
import { useAdminCitiesQuery, useAdminMoviesQuery, useAdminShowsQuery, useAdminTheatresQuery } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import { showSlotOptions } from '../types/enums';
import type { ShowResponse } from '../types';

const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const timeLabel=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date);};
const dateLabel=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(date);};
const labelFor=(options:readonly {value:string;label:string}[],value:string)=>options.find(option=>option.value===value)?.label??value;

function StatCard({title,value,to,icon:Icon,loading}:{title:string;value:number;to:'/admin/movies'|'/admin/shows'|'/admin/theatres'|'/admin/cities';icon:typeof Film;loading:boolean}){
  return <Link to={to} aria-label={`${title}: ${loading?'loading':value}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Card className="h-full transition-colors hover:bg-page-muted"><CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5"><div className="min-w-0"><p className="truncate text-sm text-text-secondary">{title}</p>{loading?<Skeleton className="mt-2 h-8 w-16"/>:<p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>}</div><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-page-muted text-text-secondary"><Icon className="size-5"/></span></CardContent></Card></Link>;
}

export default function AdminDashboardPage(){
  const moviesQuery=useAdminMoviesQuery();const showsQuery=useAdminShowsQuery();const theatresQuery=useAdminTheatresQuery();const citiesQuery=useAdminCitiesQuery();
  const movies=moviesQuery.data??[];const shows=showsQuery.data??[];const theatres=theatresQuery.data??[];const cities=citiesQuery.data??[];
  const screenQueries=useQueries({queries:theatres.map(theatre=>adminTheatreQuery(theatre.id))});
  const today=localDate(new Date());
  const nowShowing=movies.filter(movie=>movie.movieStatus==='NOW_SHOWING').length;
  const showsToday=shows.filter(show=>localDate(new Date(show.startTime))===today).length;
  const upcoming=useMemo(()=>{const now=Date.now();return shows.filter(show=>new Date(show.startTime).getTime()>=now&&show.status!=='CANCELLED').sort((a,b)=>a.startTime.localeCompare(b.startTime));},[shows]);
  const listErrors=[moviesQuery.error,showsQuery.error,theatresQuery.error,citiesQuery.error].filter(Boolean);
  const screenQueryError=screenQueries.find(query=>query.error)?.error;
  const setup=[cities.length>0,theatres.length>0,screenQueries.some(query=>(query.data?.screens.length??0)>0),movies.length>0,shows.length>0];
  const [movieDialog,setMovieDialog]=useState(false);const [showsDialog,setShowsDialog]=useState(false);const [theatreDialog,setTheatreDialog]=useState(false);const [cityDialog,setCityDialog]=useState(false);
  const upcomingColumns:Column<ShowResponse>[]=[
    {id:'movieName',header:'Movie',accessor:show=>show.movieName},
    {id:'venue',header:'Theatre / Screen',accessor:show=>`${show.theatreName} / ${show.screenName}`},
    {id:'startTime',header:'Date & time',accessor:show=>show.startTime,render:show=><span className="whitespace-nowrap">{dateLabel(show.startTime)} · {timeLabel(show.startTime)}</span>},
    {id:'showSlot',header:'Slot',accessor:show=>labelFor(showSlotOptions,show.showSlot)},
  ];
  const loadingMovies=moviesQuery.isLoading;const loadingShows=showsQuery.isLoading;const loadingTheatres=theatresQuery.isLoading;const loadingCities=citiesQuery.isLoading;
  const allComplete=setup.every(Boolean);
  return <>
    <PageHeader title="Dashboard" subtitle="A live overview of your catalogue and schedule."/>
    {listErrors.length>0&&<div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-subtle bg-page-muted p-4 text-sm text-text-secondary"><p>Some dashboard data could not be loaded: {[moviesQuery.error,showsQuery.error,theatresQuery.error,citiesQuery.error].filter(Boolean).map(error=>getApiErrorMessage(error)).join('; ')}</p><Button variant="outline" size="sm" onClick={()=>{void Promise.all([moviesQuery.refetch(),showsQuery.refetch(),theatresQuery.refetch(),citiesQuery.refetch()]);}}>Retry</Button></div>}
    <section aria-label="Admin statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
      <StatCard title="Movies" value={movies.length} to="/admin/movies" icon={Film} loading={loadingMovies}/>
      <StatCard title="Now showing" value={nowShowing} to="/admin/movies" icon={Film} loading={loadingMovies}/>
      <StatCard title="Shows today" value={showsToday} to="/admin/shows" icon={CalendarClock} loading={loadingShows}/>
      <StatCard title="Upcoming shows" value={upcoming.length} to="/admin/shows" icon={CalendarClock} loading={loadingShows}/>
      <StatCard title="Theatres" value={theatres.length} to="/admin/theatres" icon={Building2} loading={loadingTheatres}/>
      <StatCard title="Cities" value={cities.length} to="/admin/cities" icon={MapPin} loading={loadingCities}/>
    </section>

    <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-text-primary">Upcoming shows</h2><Button asChild variant="outline" size="sm"><Link to="/admin/shows">All shows</Link></Button></div>
        <DataTable rows={upcoming.slice(0,8)} columns={upcomingColumns} rowKey={show=>show.showId} loading={showsQuery.isLoading} error={showsQuery.error?getApiErrorMessage(showsQuery.error):undefined} onRetry={()=>void showsQuery.refetch()} emptyTitle="No upcoming shows" searchColumns={upcomingColumns}/>
      </div>
      <Card><CardHeader className="pb-3"><CardTitle className="text-lg">Quick actions</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <Button className="w-full justify-start" onClick={()=>setMovieDialog(true)}><Plus className="size-4"/>Add movie</Button>
        <Button className="w-full justify-start" onClick={()=>setShowsDialog(true)}><Plus className="size-4"/>Add shows</Button>
        <Button className="w-full justify-start" onClick={()=>setTheatreDialog(true)}><Plus className="size-4"/>Add theatre</Button>
        <Button className="w-full justify-start" onClick={()=>setCityDialog(true)}><Plus className="size-4"/>Add city</Button>
      </CardContent></Card>
    </section>

    {!allComplete&&<Card className="mt-7"><CardHeader><CardTitle>Setup checklist</CardTitle></CardHeader><CardContent><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
      {label:'Add a city',to:'/admin/cities',done:setup[0]},
      {label:'Add a theatre',to:'/admin/theatres',done:setup[1]},
      {label:'Add a screen',to:'/admin/theatres',done:setup[2]},
      {label:'Add a movie',to:'/admin/movies',done:setup[3]},
      {label:'Add shows',to:'/admin/shows',done:setup[4]},
    ].map((step,index)=><li key={step.label}><Link to={step.to} className="flex min-h-14 items-center gap-3 rounded-md border border-subtle p-3 text-sm text-text-primary hover:bg-page-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${step.done?'border-success bg-success/10 text-success':'border-subtle text-text-muted'}`}>{step.done?<Check className="size-4"/>:index+1}</span><span>{step.label}</span></Link></li>)}</ol>{screenQueryError&&<p role="status" className="mt-3 text-sm text-text-secondary">Screen setup status could not be checked: {getApiErrorMessage(screenQueryError)}</p>}</CardContent></Card>}

    <MovieFormDialog open={movieDialog} onOpenChange={setMovieDialog} movie={null}/>
    <AddShowsDialog open={showsDialog} onOpenChange={setShowsDialog} movies={movies} theatres={theatres} shows={shows}/>
    <TheatreFormDialog open={theatreDialog} onOpenChange={setTheatreDialog} cities={cities} citiesLoading={citiesQuery.isLoading}/>
    <CityFormDialog open={cityDialog} onOpenChange={setCityDialog} cities={cities}/>
  </>;
}

