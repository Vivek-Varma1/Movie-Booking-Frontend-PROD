export const languages = ['TELUGU','TAMIL','MALAYALAM','HINDI','ENGLISH','KANNADA'] as const;
export type Language = typeof languages[number];
export const genres = ['ACTION','ADVENTURE','COMEDY','CRIME','DRAMA','FAMILY','FANTASY','HORROR','MYSTERY','ROMANCE','SCI_FI','THRILLER','MYTHOLOGY','SUPERHERO'] as const;
export type Genre = typeof genres[number];
export const certificates = ['U','UA','A','S','UA13'] as const;
export type Certificate = typeof certificates[number];
export const movieStatuses = ['COMING_SOON','NOW_SHOWING','ENDED'] as const;
export type MovieStatus = typeof movieStatuses[number];
export const seatCategories = ['REGULAR','PREMIUM','RECLINER'] as const;
export type SeatCategory = typeof seatCategories[number];
export const roles = ['USER','ADMIN'] as const;
export type Role = typeof roles[number];
const friendly = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
export const languageOptions = languages.map(value => ({value, label: friendly(value)}));
export const genreOptions = genres.map(value => ({value, label: value === 'SCI_FI' ? 'Sci-Fi' : friendly(value)}));
export const certificateOptions = certificates.map(value => ({value, label: value === 'UA13' ? 'UA13+' : value}));
export const movieStatusOptions = movieStatuses.map(value => ({value, label: friendly(value), tone: value === 'COMING_SOON' ? 'info' : value === 'NOW_SHOWING' ? 'success' : 'neutral'} as const));
export const seatCategoryOptions = seatCategories.map((value, index) => ({value, label: friendly(value), displayPrice: [150,250,400][index]}));
export const roleOptions = roles.map(value => ({value, label: friendly(value)}));
// Backend enum definitions are pending; never submit guessed slot/status values.
export const showSlotOptions: readonly {value: string; label: string; time: string}[] = [];
export const showStatusOptions: readonly {value: string; label: string}[] = [];
export type ShowSlot = string;
export type ShowStatus = string;
export interface UserResponse {id: string | number; name: string; email: string; phoneNumber: string | null; role: Role}
export interface MovieResponse {id: string | number; movieName: string; durationInMinutes: number; language: Language; genres: Genre[]; certificate: Certificate; movieStatus: MovieStatus; releaseDate: string; posterUrl: string; trailerUrl: string; synopsis: string}
export interface CityResponse {cityId: number; name: string}
export interface TheatreSummary {id: number; name: string; address: string; cityId: number; cityName: string}
export interface TheatreResponse extends TheatreSummary {screens: ScreenSummary[]}
export interface ScreenSummary {id: number; name: string; totalSeats: number}
export interface CreateScreenRequest {name: string; lastRow: string; seatsPerRow: number; seatRules: {fromRow: string; toRow: string; seatCategory: SeatCategory}[]}
export interface ShowResponse {showId: number; startTime: string; endTime: string; durationInMinutes: number; screenId: number; screenName: string; theatreId: number; theatreName: string; movieId: number; movieName: string; availableSeats: number; totalSeats: number; minimumPrice: number; status: ShowStatus; showSlot: ShowSlot}
export interface CreateShowRequest {movieId: number; screenId: number; showDate: string; showSlot: ShowSlot}
