import { http } from '@/services/http';
import { appConfig } from '@/theme/theme';
import type { TheatreResponse, TheatreSummary, CreateScreenRequest, ScreenSummary } from '../types';
import { citiesApi } from './cities';
import { screenValidation } from '../lib/venue-validation';
type TheatreInput = {name:string;address:string;cityId:number};
let rows: TheatreResponse[] = []; let nextId = 1; let nextScreenId = 1;
export const theatresApi = {
  list: async (): Promise<TheatreSummary[]> => appConfig.useMock ? [...rows] : (await http.get<TheatreSummary[]>('/theatres')).data,
  get: async (id:number): Promise<TheatreResponse> => {
    if (!appConfig.useMock) return (await http.get<TheatreResponse>(`/theatres/${id}`)).data;
    const row = rows.find(r=>r.id===id); if (!row) throw {response:{status:404}}; return row;
  },
  create: async (input:TheatreInput): Promise<TheatreResponse> => {
    if (!appConfig.useMock) return (await http.post<TheatreResponse>('/theatres',input)).data;
    const city = (await citiesApi.list()).find(c=>c.cityId===input.cityId);
    const row = {...input,id:nextId++,cityName:city?.name ?? '',screens:[]}; rows=[...rows,row]; return row;
  },
  update: async (id:number,input:TheatreInput): Promise<TheatreResponse> => {
    if (!appConfig.useMock) return (await http.put<TheatreResponse>(`/theatres/${id}`,input)).data;
    const previous = await theatresApi.get(id); const city=(await citiesApi.list()).find(c=>c.cityId===input.cityId);
    const row={...previous,...input,cityName:city?.name ?? ''}; rows=rows.map(r=>r.id===id?row:r); return row;
  },
  remove: async (id:number) => {if (!appConfig.useMock) {await http.delete(`/theatres/${id}`);return;} rows=rows.filter(r=>r.id!==id);},
};
export async function createScreen(theatreId: number, input: CreateScreenRequest): Promise<ScreenSummary> {
  if (!appConfig.useMock) return (await http.post<ScreenSummary>(`/theatres/${theatreId}/screens`, input)).data;
  const theatre=await theatresApi.get(theatreId); const validation=screenValidation(input,theatre.screens);
  if(validation.errors.length) throw {response:{status:400,data:{message:validation.errors.join('; ')}}};
  const row = {id: nextScreenId++, name: input.name, totalSeats: validation.total};
  rows=rows.map(t=>t.id===theatreId?{...t,screens:[...t.screens,row]}:t); return row;
}
export async function deleteScreen(theatreId:number,screenId:number) {
  if (!appConfig.useMock) {await http.delete(`/theatres/${theatreId}/screens/${screenId}`);return;}
  rows=rows.map(t=>t.id===theatreId?{...t,screens:t.screens.filter(s=>s.id!==screenId)}:t);
}
