export function FieldError({message, id}: {message?: string; id?: string}) {return message ? <p id={id} role="alert" className="mt-1 text-sm text-danger">{message}</p> : null;}
