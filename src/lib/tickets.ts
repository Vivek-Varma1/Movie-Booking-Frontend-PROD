const ticketPattern = /TKT-\d{8}-[A-Z0-9]{8}/i;

export function extractTicketNumber(text: string): string | null {
  return text.match(ticketPattern)?.[0].toUpperCase() ?? null;
}
