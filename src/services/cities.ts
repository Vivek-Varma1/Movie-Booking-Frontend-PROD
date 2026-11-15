import { citiesApi } from "@/admin/services/cities";
import type { CityResponse } from "@/admin/types";

export type City = CityResponse;
export const getCities = (): Promise<City[]> => citiesApi.list();
