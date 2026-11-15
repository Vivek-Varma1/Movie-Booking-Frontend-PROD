export const languageOptions = [
  { value: 'TELUGU', label: 'Telugu' }, { value: 'TAMIL', label: 'Tamil' },
  { value: 'MALAYALAM', label: 'Malayalam' }, { value: 'HINDI', label: 'Hindi' },
  { value: 'ENGLISH', label: 'English' }, { value: 'KANNADA', label: 'Kannada' },
] as const;
export type Language = typeof languageOptions[number]['value'];
export const genreOptions = [
  { value: 'ACTION', label: 'Action' }, { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'COMEDY', label: 'Comedy' }, { value: 'CRIME', label: 'Crime' },
  { value: 'DRAMA', label: 'Drama' }, { value: 'FAMILY', label: 'Family' },
  { value: 'FANTASY', label: 'Fantasy' }, { value: 'HORROR', label: 'Horror' },
  { value: 'MYSTERY', label: 'Mystery' }, { value: 'ROMANCE', label: 'Romance' },
  { value: 'SCI_FI', label: 'Sci-Fi' }, { value: 'THRILLER', label: 'Thriller' },
  { value: 'MYTHOLOGY', label: 'Mythology' }, { value: 'SUPERHERO', label: 'Superhero' },
] as const;
export type Genre = typeof genreOptions[number]['value'];
export const certificateOptions = [{value:'U',label:'U'},{value:'UA',label:'UA'},{value:'A',label:'A'},{value:'S',label:'S'},{value:'UA13',label:'UA13+'}] as const;
export type Certificate = typeof certificateOptions[number]['value'];
export const movieStatusOptions = [{value:'COMING_SOON',label:'Coming soon',tone:'info'},{value:'NOW_SHOWING',label:'Now showing',tone:'success'},{value:'ENDED',label:'Ended',tone:'neutral'}] as const;
export type MovieStatus = typeof movieStatusOptions[number]['value'];
export const seatCategoryOptions = [{value:'REGULAR',label:'Regular',displayPrice:150},{value:'PREMIUM',label:'Premium',displayPrice:250},{value:'RECLINER',label:'Recliner',displayPrice:400}] as const;
export type SeatCategory = typeof seatCategoryOptions[number]['value'];
export const showSlotOptions = [{value:'MORNING',label:'Morning 9:00 AM',time:'09:00'},{value:'MATINEE',label:'Matinee 12:00 PM',time:'12:00'},{value:'AFTERNOON',label:'Afternoon 3:00 PM',time:'15:00'},{value:'EVENING',label:'Evening 6:00 PM',time:'18:00'},{value:'NIGHT',label:'Night 9:00 PM',time:'21:00'}] as const;
export type ShowSlot = typeof showSlotOptions[number]['value'];
export const showStatusOptions = [{value:'SCHEDULED',label:'Scheduled',tone:'neutral'},{value:'OPEN_FOR_BOOKING',label:'Open for booking',tone:'success'},{value:'BOOKING_CLOSED',label:'Booking closed',tone:'warning'},{value:'SHOW_RUNNING',label:'Show running',tone:'info'},{value:'COMPLETED',label:'Completed',tone:'neutral'},{value:'CANCELLED',label:'Cancelled',tone:'danger'}] as const;
export type ShowStatus = typeof showStatusOptions[number]['value'];
export const roles = ['USER','ADMIN'] as const;
export type Role = typeof roles[number];
export const roleOptions = [{value:'USER',label:'User'},{value:'ADMIN',label:'Admin'}] as const;
