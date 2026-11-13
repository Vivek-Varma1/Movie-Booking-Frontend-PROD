import { http } from '@/services/http';
import { appConfig } from '@/theme/theme';
// Resource clients are foundation only; confirm controller paths before wiring CRUD pages.
export function resource<T, C = Partial<T>>(path: string, key: keyof T) {
  let rows: T[] = [];
  let nextId = 1;
  return {
    list: async (): Promise<T[]> => appConfig.useMock ? [...rows] : (await http.get<T[]>(path)).data,
    get: async (id: string | number): Promise<T> => {
      if (!appConfig.useMock) return (await http.get<T>(`${path}/${id}`)).data;
      const row = rows.find(row => String(row[key]) === String(id));
      if (!row) throw {response: {status: 404}};
      return row;
    },
    create: async (input: C | FormData): Promise<T> => {
      if (!appConfig.useMock) return (await http.post<T>(path, input)).data;
      if (input instanceof FormData) throw new Error('Mock uploads require structured data');
      const row = {...input, [key]: nextId++} as unknown as T;
      rows = [...rows, row]; return row;
    },
    update: async (id: string | number, input: Partial<T> | FormData): Promise<T> => {
      if (!appConfig.useMock) return (await http.put<T>(`${path}/${id}`, input)).data;
      if (input instanceof FormData) throw new Error('Mock uploads require structured data');
      const previous = rows.find(row => String(row[key]) === String(id));
      if (!previous) throw {response: {status:404}};
      const row = {...previous, ...input}; rows = rows.map(r => String(r[key]) === String(id) ? row : r); return row;
    },
    remove: async (id: string | number): Promise<void> => {
      if (!appConfig.useMock) { await http.delete(`${path}/${id}`); return; }
      rows = rows.filter(row => String(row[key]) !== String(id));
    },
  };
}
