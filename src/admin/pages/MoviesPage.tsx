import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Film, LockKeyhole, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { FormDialog } from '../components/FormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldError } from '../components/FieldError';
import { ImageUpload } from '../components/ImageUpload';
import { StatusBadge } from '../components/StatusBadge';
import { useAdminMoviesQuery, useCreateMovie, useDeleteMovie, useUpdateMovie, useUpdateMovieStatus } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import { certificateOptions, genreOptions, languageOptions, movieStatusOptions, type MovieStatus } from '../types/enums';
import type { MovieResponse } from '../types';

const schema = z.object({
  movieName: z.string().trim().min(1, 'Movie name is required').max(255, 'Use 255 characters or fewer'),
  durationInMinutes: z.coerce.number().int('Enter a whole number').min(30, 'Duration must be at least 30 minutes').max(500, 'Duration must be 500 minutes or less'),
  language: z.string().refine(value => languageOptions.some(option => option.value === value), 'Select a language'),
  genres: z.array(z.string().refine(value => genreOptions.some(option => option.value === value))).min(1, 'Choose at least one genre'),
  certificate: z.string().refine(value => certificateOptions.some(option => option.value === value), 'Select a certificate'),
  movieStatus: z.string().refine(value => movieStatusOptions.some(option => option.value === value), 'Select a status'),
  releaseDate: z.string().min(1, 'Release date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  trailerUrl: z.string().trim().max(1000, 'Use 1000 characters or fewer').refine(value => !value || z.string().url().safeParse(value).success, 'Enter a valid URL'),
  synopsis: z.string().max(2000, 'Use 2000 characters or fewer'),
  poster: z.custom<File | null>(value => value === null || value instanceof File),
});
type MovieForm = z.infer<typeof schema>;
const blankForm: MovieForm = { movieName: '', durationInMinutes: 150, language: '' as MovieForm['language'], genres: [], certificate: '' as MovieForm['certificate'], movieStatus: 'COMING_SOON', releaseDate: '', trailerUrl: '', synopsis: '', poster: null };
const labelFor = (options: readonly {value:string;label:string}[], value: string) => options.find(option => option.value === value)?.label ?? value;
const dateLabel = (value: string) => { const date = new Date(`${value.slice(0, 10)}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date); };
const durationLabel = (value: number) => `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}m`;
const statusTone: Record<MovieStatus, 'info' | 'success' | 'neutral'> = { COMING_SOON: 'info', NOW_SHOWING: 'success', ENDED: 'neutral' };

export function MovieFormDialog({ open, onOpenChange, movie }: {open:boolean;onOpenChange:(open:boolean)=>void;movie:MovieResponse|null}) {
  const create = useCreateMovie(); const update = useUpdateMovie(); const edit = !!movie;
  const form = useForm<MovieForm>({ resolver: zodResolver(schema), defaultValues: blankForm });
  const { register, control, handleSubmit, reset, watch, formState:{errors} } = form;
  const pending = create.isPending || update.isPending;
  useEffect(() => {
    if (open) reset(movie ? { ...blankForm, movieName:movie.movieName, durationInMinutes:movie.durationInMinutes, language:movie.language, genres:movie.genres, certificate:movie.certificate, movieStatus:movie.movieStatus, releaseDate:movie.releaseDate.slice(0,10), trailerUrl:movie.trailerUrl??'', synopsis:movie.synopsis??'', poster:null } : blankForm);
  }, [open, movie, reset]);
  const synopsis = watch('synopsis');
  const current = watch();
  const hasChanges = !movie || current.movieStatus!==movie.movieStatus || current.trailerUrl.trim()!==(movie.trailerUrl??'') || current.synopsis.trim()!==(movie.synopsis??'') || !!current.poster;
  const submit = async (values:MovieForm) => {
    if (!movie && !values.poster) { form.setError('poster',{message:'Poster is required'}); return; }
    try {
      if (!movie) {
        const payload: Record<string,unknown> = { movieName:values.movieName.trim(), durationInMinutes:values.durationInMinutes, language:values.language, genres:values.genres, certificate:values.certificate, movieStatus:values.movieStatus, releaseDate:values.releaseDate };
        if (values.trailerUrl.trim()) payload['trailerUrl']=values.trailerUrl.trim();
        if (values.synopsis.trim()) payload['synopsis']=values.synopsis.trim();
        const fd=new FormData(); fd.append('request',new Blob([JSON.stringify(payload)],{type:'application/json'})); fd.append('poster',values.poster as File);
        await create.mutateAsync(fd);
      } else {
        const changed:Record<string,unknown>={};
        if(values.movieStatus!==movie.movieStatus) changed['movieStatus']=values.movieStatus;
        if(values.trailerUrl.trim()!==(movie.trailerUrl??'')) changed['trailerUrl']=values.trailerUrl.trim();
        if(values.synopsis.trim()!==(movie.synopsis??'')) changed['synopsis']=values.synopsis.trim();
        const fd=new FormData();
        if(Object.keys(changed).length) fd.append('request',new Blob([JSON.stringify(changed)],{type:'application/json'}));
        if(values.poster) fd.append('poster',values.poster);
        if(!Object.keys(changed).length&&!values.poster)return;
        await update.mutateAsync({id:movie.id,input:fd});
      }
      onOpenChange(false);
    } catch(error) {
      const message = !movie && (error as {response?:{status?:number}})?.response?.status===409 ? 'This movie already exists in this language.' : getApiErrorMessage(error);
      toast.error(message);
    }
  };
  const fieldError=(name:keyof MovieForm)=>errors[name]?.message as string|undefined;
  const selectClass='h-10 w-full rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50';
  const locked=(label:string, value:string)=><div className="space-y-2"><Label>{label}</Label><Tooltip><TooltipTrigger asChild><div className="flex min-h-10 items-center gap-2 rounded-md border border-subtle bg-page-muted px-3 text-sm text-text-secondary"><LockKeyhole className="size-4 shrink-0"/><span className="truncate">{value}</span></div></TooltipTrigger><TooltipContent>Can't be changed after creation</TooltipContent></Tooltip></div>;
  return <FormDialog open={open} onOpenChange={onOpenChange} title={edit?'Edit movie':'Add movie'} description={edit?'Update the movie status, trailer, synopsis or poster.':'Add a movie to the catalogue.'} submitting={pending} submitDisabled={!hasChanges} onSubmit={handleSubmit(submit)} submitLabel={edit?'Save changes':'Add movie'} className="sm:max-w-3xl">
    <TooltipProvider><div className="space-y-5">
      {edit ? <div className="grid gap-4 sm:grid-cols-2">{locked('Movie name',movie.movieName)}{locked('Language',labelFor(languageOptions,movie.language))}{locked('Duration',durationLabel(movie.durationInMinutes))}{locked('Genres',movie.genres.map(value=>labelFor(genreOptions,value)).join(', '))}{locked('Certificate',labelFor(certificateOptions,movie.certificate))}{locked('Release date',dateLabel(movie.releaseDate))}</div> : <>
        <div className="space-y-2"><Label htmlFor="movie-name">Movie name</Label><Input id="movie-name" maxLength={255} aria-invalid={!!fieldError('movieName')} {...register('movieName')}/><FieldError message={fieldError('movieName')}/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="movie-duration">Duration (minutes)</Label><Input id="movie-duration" type="number" min={30} max={500} aria-invalid={!!fieldError('durationInMinutes')} {...register('durationInMinutes')}/><FieldError message={fieldError('durationInMinutes')}/></div>
          <div className="space-y-2"><Label htmlFor="movie-language">Language</Label><select id="movie-language" className={selectClass} aria-invalid={!!fieldError('language')} {...register('language')}><option value="">Select language</option>{languageOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError message={fieldError('language')}/></div>
          <div className="space-y-2"><Label htmlFor="movie-certificate">Certificate</Label><select id="movie-certificate" className={selectClass} aria-invalid={!!fieldError('certificate')} {...register('certificate')}><option value="">Select certificate</option>{certificateOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError message={fieldError('certificate')}/></div>
          <div className="space-y-2"><Label htmlFor="movie-status">Status</Label><select id="movie-status" className={selectClass} aria-invalid={!!fieldError('movieStatus')} {...register('movieStatus')}>{movieStatusOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><FieldError message={fieldError('movieStatus')}/></div>
          <div className="space-y-2"><Label htmlFor="movie-release">Release date</Label><Input id="movie-release" type="date" aria-invalid={!!fieldError('releaseDate')} {...register('releaseDate')}/><FieldError message={fieldError('releaseDate')}/></div>
        </div>
        <div className="space-y-2"><Label>Genres</Label><Controller control={control} name="genres" render={({field})=><div className="flex flex-wrap gap-2">{genreOptions.map(option=>{const selected=field.value.includes(option.value);return <button key={option.value} type="button" aria-pressed={selected} onClick={()=>field.onChange(selected?field.value.filter(item=>item!==option.value):[...field.value,option.value])} className={`rounded-md border px-3 py-1.5 text-sm ${selected?'border-accent bg-accent-soft text-text-primary':'border-subtle bg-surface text-text-secondary'}`}>{option.label}</button>;})}</div>}/><FieldError message={fieldError('genres')}/></div>
      </>}
      <div className="space-y-2"><Label htmlFor="movie-trailer">Trailer URL {edit?'':'(optional)'}</Label><Input id="movie-trailer" type="url" maxLength={1000} aria-invalid={!!fieldError('trailerUrl')} {...register('trailerUrl')}/><FieldError message={fieldError('trailerUrl')}/></div>
      <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="movie-synopsis">Synopsis {edit?'':'(optional)'}</Label><span className="text-xs text-text-muted">{synopsis.length}/2000</span></div><Textarea id="movie-synopsis" maxLength={2000} rows={4} aria-invalid={!!fieldError('synopsis')} {...register('synopsis')}/><FieldError message={fieldError('synopsis')}/></div>
      <div className="space-y-2"><Label>Poster {edit?'(optional replacement)':'(required)'}</Label><Controller control={control} name="poster" render={({field})=><ImageUpload value={field.value} onChange={field.onChange} maxBytes={5*1024*1024} disabled={pending}/>}/><FieldError message={fieldError('poster')}/></div>
    </div></TooltipProvider>
  </FormDialog>;
}

export default function MoviesPage() {
  const moviesQuery=useAdminMoviesQuery(); const remove=useDeleteMovie(); const statusUpdate=useUpdateMovieStatus();
  const [statusFilter,setStatusFilter]=useState(''); const [languageFilter,setLanguageFilter]=useState('');
  const [formOpen,setFormOpen]=useState(false); const [editing,setEditing]=useState<MovieResponse|null>(null); const [deleting,setDeleting]=useState<MovieResponse|null>(null); const [deleteError,setDeleteError]=useState('');
  const movies=moviesQuery.data??[];
  const filtered=useMemo(()=>movies.filter(movie=>(!statusFilter||movie.movieStatus===statusFilter)&&(!languageFilter||movie.language===languageFilter)),[movies,statusFilter,languageFilter]);
  const columns:Column<MovieResponse>[]=[
    {id:'poster',header:'Poster',accessor:movie=>movie.movieName,sortable:false,render:movie=>movie.posterUrl?<img src={movie.posterUrl} alt={`${movie.movieName} poster`} className="h-14 w-10 rounded-md object-cover"/>:<div className="flex h-14 w-10 items-center justify-center rounded-md bg-page-muted text-text-muted"><Film className="size-5"/></div>},
    {id:'movieName',header:'Movie',accessor:movie=>movie.movieName,render:movie=><div className="min-w-32"><p className="font-medium text-text-primary">{movie.movieName}</p><Badge variant="outline" className="mt-1">{labelFor(languageOptions,movie.language)}</Badge></div>},
    {id:'certificate',header:'Certificate',accessor:movie=>movie.certificate,render:movie=>labelFor(certificateOptions,movie.certificate)},
    {id:'duration',header:'Duration',accessor:movie=>movie.durationInMinutes,render:movie=>durationLabel(movie.durationInMinutes)},
    {id:'genres',header:'Genres',accessor:movie=>movie.genres.map(value=>labelFor(genreOptions,value)).join(' '),render:movie=><div className="flex min-w-32 flex-wrap gap-1">{movie.genres.slice(0,2).map(genre=><Badge key={genre} variant="secondary">{labelFor(genreOptions,genre)}</Badge>)}{movie.genres.length>2&&<Badge variant="outline">+{movie.genres.length-2}</Badge>}</div>},
    {id:'movieStatus',header:'Status',accessor:movie=>movie.movieStatus,render:movie=><StatusBadge tone={statusTone[movie.movieStatus]}>{labelFor(movieStatusOptions,movie.movieStatus)}</StatusBadge>},
    {id:'releaseDate',header:'Release date',accessor:movie=>movie.releaseDate.slice(0,10),render:movie=>dateLabel(movie.releaseDate)},
  ];
  const deleteMovie=async()=>{if(!deleting)return;setDeleteError('');try{await remove.mutateAsync(deleting.id);setDeleting(null);}catch(error){setDeleteError(getApiErrorMessage(error));}};
  const selectClass='h-10 min-w-36 rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary';
  return <>
    <PageHeader title="Movies" subtitle="Manage the movie catalogue and release information." primaryAction={<Button onClick={()=>{setEditing(null);setFormOpen(true);}}><Plus className="size-4"/>Add movie</Button>}/>
    <DataTable rows={filtered} columns={columns} rowKey={movie=>movie.id} loading={moviesQuery.isLoading} error={moviesQuery.error?getApiErrorMessage(moviesQuery.error):undefined} onRetry={()=>void moviesQuery.refetch()} searchColumns={[columns[1]!]} emptyTitle="No movies yet" emptyIcon={<Film className="size-9 text-text-muted"/>} emptyAction={<Button onClick={()=>{setEditing(null);setFormOpen(true);}}><Plus className="size-4"/>Add movie</Button>}
      filterSlot={<><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Status</span><select aria-label="Filter movies by status" className={selectClass} value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="">All statuses</option>{movieStatusOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-text-secondary"><span>Language</span><select aria-label="Filter movies by language" className={selectClass} value={languageFilter} onChange={event=>setLanguageFilter(event.target.value)}><option value="">All languages</option>{languageOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></>}
      actions={movie=>[...movieStatusOptions.filter(option=>option.value!==movie.movieStatus).map(option=>({label:`Set ${option.label}`,onSelect:()=>statusUpdate.mutate({id:movie.id,movieStatus:option.value})})),{label:'Edit',onSelect:()=>{setEditing(movie);setFormOpen(true);}},{label:'Delete',destructive:true,onSelect:()=>{setDeleting(movie);setDeleteError('');}}]}/>
    <MovieFormDialog open={formOpen} onOpenChange={open=>{setFormOpen(open);if(!open)setEditing(null);}} movie={editing}/>
    <ConfirmDialog open={!!deleting} onOpenChange={open=>{if(!open&&!remove.isPending){setDeleting(null);setDeleteError('');}}} title={`Delete ${deleting?.movieName??'movie'}?`} description="Type the movie name to confirm deletion." confirmName={deleting?.movieName??''} loading={remove.isPending} onConfirm={deleteMovie} error={deleteError}/>
  </>;
}
