import { resource } from './resource';
import type { CityResponse } from '../types';
import { http } from '@/services/http';
import { appConfig } from '@/theme/theme';
export const citiesApi = resource<CityResponse, {name:string}>('/cities', 'cityId');
export async function createCitiesBulk(cities: string[]) {
  if (!appConfig.useMock) { await http.post('/cities/bulk', {cities}); return; }
  await Promise.all(cities.map(name => citiesApi.create({name})));
}
