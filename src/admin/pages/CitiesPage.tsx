import { useMemo, useState, type FormEvent } from 'react';
import { MapPin, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { FormDialog } from '../components/FormDialog';
import { CityFormDialog } from '../components/CityFormDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldError } from '../components/FieldError';
import { useAdminCitiesQuery, useCreateCitiesBulk, useDeleteCity } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import type { CityResponse } from '../types';

type Mode = 'add' | 'edit' | 'bulk' | null;
const normalize = (name: string) => name.trim().toLocaleLowerCase();

export default function CitiesPage() {
  const citiesQuery = useAdminCitiesQuery();
  const cities = citiesQuery.data ?? [];
  const remove = useDeleteCity();
  const bulk = useCreateCitiesBulk();
  const [mode, setMode] = useState<Mode>(null);
  const [editing, setEditing] = useState<CityResponse | null>(null);
  const [deleting, setDeleting] = useState<CityResponse | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const pending = bulk.isPending;
  const bulkNames = useMemo(() => {
    const seen = new Set(cities.map(city => normalize(city.name)));
    const unique: string[] = [];
    let duplicates = 0;
    for (const line of bulkText.split(/\r?\n/)) {
      const city = line.trim();
      if (!city) continue;
      const key = normalize(city);
      if (seen.has(key)) { duplicates += 1; continue; }
      seen.add(key);
      unique.push(city);
    }
    return { unique, duplicates };
  }, [bulkText, cities]);

  const closeForm = (open: boolean) => {
    if (!open && !pending) { setMode(null); setEditing(null); setFormError(''); }
  };
  const openAdd = () => { setEditing(null); setMode('add'); };
  const openEdit = (city: CityResponse) => { setEditing(city); setMode('edit'); };
  const submitBulk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bulkNames.unique.length) { setFormError('Enter at least one new city'); return; }
    setFormError('');
    try { await bulk.mutateAsync(bulkNames.unique); setBulkText(''); setMode(null); }
    catch (error) { setFormError(getApiErrorMessage(error)); }
  };
  const deleteCity = async () => {
    if (!deleting) return;
    setDeleteError('');
    try { await remove.mutateAsync(deleting.cityId); setDeleting(null); }
    catch (error) { setDeleteError(`${getApiErrorMessage(error)}. This city may still have theatres.`); }
  };

  const columns: Column<CityResponse>[] = [
    { id: 'cityId', header: 'ID', accessor: city => city.cityId },
    { id: 'name', header: 'Name', accessor: city => city.name },
  ];
  return <>
    <PageHeader title="Cities" subtitle="Manage the cities available in the booking experience."
      primaryAction={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setBulkText(''); setFormError(''); setMode('bulk'); }}><Upload className="size-4"/>Bulk add</Button><Button onClick={openAdd}><Plus className="size-4"/>Add city</Button></div>} />
    <DataTable rows={cities} columns={columns} rowKey={city => city.cityId} loading={citiesQuery.isLoading} error={citiesQuery.error?getApiErrorMessage(citiesQuery.error):undefined} onRetry={()=>void citiesQuery.refetch()}
      searchColumns={[columns[1]!]} emptyTitle="No cities yet" emptyIcon={<MapPin className="size-9 text-text-muted"/>}
      emptyAction={<Button onClick={openAdd}><Plus className="size-4"/>Add city</Button>}
      actions={city => [
        { label: 'Edit', onSelect: () => openEdit(city) },
        { label: 'Delete', destructive: true, onSelect: () => { setDeleting(city); setDeleteError(''); } },
      ]} />

    <CityFormDialog open={mode === 'add' || mode === 'edit'} onOpenChange={closeForm} cities={cities} city={editing}/>

    <FormDialog open={mode === 'bulk'} onOpenChange={closeForm} title="Bulk add cities" description="Enter one city name per line. Existing names are ignored case-insensitively." submitting={pending} onSubmit={submitBulk} submitLabel="Add cities">
      <div className="space-y-3"><Label htmlFor="city-bulk">City names</Label><Textarea id="city-bulk" rows={8} value={bulkText} disabled={pending} onChange={event => { setBulkText(event.target.value); setFormError(''); }} placeholder={'Hyderabad\nVisakhapatnam\nVijayawada'}/><p aria-live="polite" className="text-sm text-text-secondary">{bulkNames.unique.length} {bulkNames.unique.length === 1 ? 'city' : 'cities'} will be added ({bulkNames.duplicates} duplicates ignored)</p><FieldError message={formError}/></div>
    </FormDialog>

    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open && !remove.isPending) { setDeleting(null); setDeleteError(''); } }} title={`Delete ${deleting?.name ?? 'city'}?`} description="This action cannot be undone." loading={remove.isPending} onConfirm={deleteCity} error={deleteError}/>
  </>;
}
