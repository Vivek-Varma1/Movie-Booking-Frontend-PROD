import type { CityResponse, CreateScreenRequest, ScreenSummary, SeatCategory } from '../types';
export const nameKey = (name: string) => name.trim().toLocaleLowerCase();
export function cityNameError(name: string, cities: CityResponse[], excluding?: number) {
  if (!name.trim()) return 'Name is required';
  return cities.some(c => c.cityId !== excluding && nameKey(c.name) === nameKey(name)) ? 'A city with this name already exists' : undefined;
}
export function bulkCities(text: string, cities: CityResponse[]) {
  const seen = new Set(cities.map(c => nameKey(c.name))); const names: string[] = []; let duplicates = 0;
  for (const name of text.split(/\r?\n/).map(n => n.trim()).filter(Boolean)) {
    const key = nameKey(name); if (seen.has(key)) duplicates++; else { seen.add(key); names.push(name); }
  }
  return {cities: names, duplicates};
}
export function theatreErrors(input: {name: string; address: string; cityId: number}) {
  return {name: !input.name.trim() ? 'Name is required' : input.name.trim().length > 100 ? 'Maximum 100 characters' : undefined,
    address: !input.address.trim() ? 'Address is required' : input.address.trim().length > 255 ? 'Maximum 255 characters' : undefined,
    cityId: !Number.isInteger(input.cityId) || input.cityId < 1 ? 'Select a city' : undefined};
}
export const rowLetters = (lastRow: string) => /^[A-Z]$/.test(lastRow) ? Array.from({length: lastRow.charCodeAt(0) - 64}, (_, i) => String.fromCharCode(65 + i)) : [];
export function screenValidation(input: CreateScreenRequest, screens: ScreenSummary[]) {
  const rows = rowLetters(input.lastRow); const errors: string[] = []; const offenders = new Set<number>();
  if (!input.name.trim()) errors.push('Name is required');
  else if (input.name.trim().length > 50) errors.push('Maximum 50 characters');
  else if (screens.some(s => nameKey(s.name) === nameKey(input.name))) errors.push('A screen with this name already exists');
  if (!rows.length) errors.push('Last row must be a single letter A–Z');
  if (!Number.isInteger(input.seatsPerRow) || input.seatsPerRow < 1 || input.seatsPerRow > 40) errors.push('Seats per row must be an integer from 1 to 40');
  if (!input.seatRules.length) errors.push('Add at least one seat rule');
  const assignments = new Map<string, SeatCategory>(); const owners = new Map<string, number>();
  input.seatRules.forEach((rule, i) => {
    if (!/^[A-Z]$/.test(rule.fromRow) || !/^[A-Z]$/.test(rule.toRow) || rule.fromRow > rule.toRow || rule.toRow > input.lastRow || !rows.length) {offenders.add(i); return;}
    for (const row of rows.filter(r => r >= rule.fromRow && r <= rule.toRow)) {
      const owner = owners.get(row); if (owner !== undefined) { offenders.add(owner); offenders.add(i); }
      owners.set(row, i); assignments.set(row, rule.seatCategory);
    }
  });
  if (offenders.size) errors.push('Seat rules must be within A–' + (input.lastRow || 'Z') + ', ordered and non-overlapping');
  const uncovered = rows.filter(row => !assignments.has(row));
  const counts = {REGULAR: 0, PREMIUM: 0, RECLINER: 0};
  for (const category of assignments.values()) counts[category] += Number.isInteger(input.seatsPerRow) && input.seatsPerRow > 0 && input.seatsPerRow <= 40 ? input.seatsPerRow : 0;
  return {errors, offenders, rows, assignments, uncovered, counts, total: Object.values(counts).reduce((a,b)=>a+b,0)};
}
export function nextRule(input: CreateScreenRequest): CreateScreenRequest['seatRules'][number] | undefined {
  const uncovered = screenValidation(input, []).uncovered; const first = uncovered[0]; if (!first) return;
  let last = first; for (const row of uncovered.slice(1)) { if (row.charCodeAt(0) !== last.charCodeAt(0)+1) break; last = row; }
  return {fromRow:first, toRow:last, seatCategory:'REGULAR'};
}
