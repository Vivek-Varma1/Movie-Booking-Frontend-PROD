import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from './api-error';
import { adminKeys } from './queryKeys';
import { moviesApi } from '../services/movies';
import { showsApi } from '../services/shows';
import { theatresApi, createScreen, deleteScreen } from '../services/theatres';
import { citiesApi, createCitiesBulk } from '../services/cities';
import { usersApi } from '../services/users';
import type { CreateScreenRequest } from '../types';
export const adminMoviesQuery = () => queryOptions({queryKey:adminKeys.movies(), queryFn:moviesApi.list});
export const adminShowsQuery = () => queryOptions({queryKey:adminKeys.shows(), queryFn:showsApi.list});
export const adminTheatresQuery = () => queryOptions({queryKey:adminKeys.theatres(), queryFn:theatresApi.list});
export const adminTheatreQuery = (id:number) => queryOptions({queryKey:adminKeys.theatre(id), queryFn:()=>theatresApi.get(id)});
export const adminCitiesQuery = () => queryOptions({queryKey:adminKeys.cities(), queryFn:citiesApi.list});
export const adminUsersQuery = () => queryOptions({queryKey:adminKeys.users(), queryFn:usersApi.list});
export function useAdminMutation<T, V>(mutationFn: (variables: V) => Promise<T>, keys: readonly (readonly unknown[])[], success: string) {
  const client = useQueryClient();
  return useMutation({mutationFn, onSuccess: async () => { await Promise.all(keys.map(queryKey => client.invalidateQueries({queryKey}))); toast.success(success); }, onError: error => toast.error(getApiErrorMessage(error))});
}
export const useCreateMovie = () => useAdminMutation(moviesApi.create,[adminKeys.movies()],'Movie created');
export const useUpdateMovie = () => useAdminMutation(({id,input}:{id:string|number;input:Parameters<typeof moviesApi.update>[1]})=>moviesApi.update(id,input),[adminKeys.movies()],'Movie updated');
export const useDeleteMovie = () => useAdminMutation(moviesApi.remove,[adminKeys.movies()],'Movie deleted');
export const useCreateShow = () => useAdminMutation(showsApi.create,[adminKeys.shows()],'Show created');
export const useDeleteShow = () => useAdminMutation(showsApi.remove,[adminKeys.shows()],'Show deleted');
export const useCreateTheatre = () => useAdminMutation(theatresApi.create,[adminKeys.theatres()],'Theatre created');
export const useUpdateTheatre = () => useAdminMutation(({id,input}:{id:number;input:Parameters<typeof theatresApi.update>[1]})=>theatresApi.update(id,input),[adminKeys.theatres()],'Theatre updated');
export const useDeleteTheatre = () => useAdminMutation(theatresApi.remove,[adminKeys.theatres()],'Theatre deleted');
export const useCreateScreen = () => useAdminMutation(({theatreId,input}:{theatreId:number;input:CreateScreenRequest})=>createScreen(theatreId,input),[adminKeys.theatres()],'Screen created');
export const useCreateCity = () => useAdminMutation(citiesApi.create,[adminKeys.cities(),adminKeys.theatres()],'City created');
export const useUpdateCity = () => useAdminMutation(({id,input}:{id:number;input:Parameters<typeof citiesApi.update>[1]})=>citiesApi.update(id,input),[adminKeys.cities(),adminKeys.theatres()],'City updated');
export const useDeleteCity = () => useAdminMutation(citiesApi.remove,[adminKeys.cities(),adminKeys.theatres()],'City deleted');
export const useUpdateUser = () => useAdminMutation(({id,input}:{id:string|number;input:Parameters<typeof usersApi.update>[1]})=>usersApi.update(id,input),[adminKeys.users()],'User updated');

export const useDeleteScreen = () => useAdminMutation(({theatreId,screenId}:{theatreId:number;screenId:number})=>deleteScreen(theatreId,screenId),[adminKeys.theatres()],'Screen deleted');
export const useCreateCitiesBulk = () => useAdminMutation(createCitiesBulk,[adminKeys.cities()],'Cities added');
