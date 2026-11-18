# Build log

## Ticket QR rendering

- **Changed:** Added a reusable `TicketQR` component that fetches ticket QR images as blobs through the shared Axios client, creates an object URL for display, and revokes that URL during effect cleanup. It shows a loading skeleton and a retryable “QR unavailable” state, and logs failed response status and body details to the console.
- **Why:** Ticket responses expose a `qrCode` URL that points at `localhost:8080`; the frontend was assigning that URL directly to an image. The frontend now extracts the ticket ID from that response and requests `/tickets/{ticketId}/qr` through Axios, whose base URL comes from `VITE_API_BASE_URL`.
- **Files touched:** `src/components/booking/TicketQR.tsx`, `src/components/booking/TicketCard.tsx`, `src/services/bookings.ts`, `src/services/tickets.ts`, `BUILD_LOG.md`.
- **Verify:** Open a confirmed ticket from the booking confirmation page or My Bookings. In DevTools → Network, find `GET https://movie-booking-service-rabbitmq.onrender.com/api/tickets/{ticketId}/qr`; expect status `200` and `Content-Type: image/png`. The backend `SecurityConfig` permits `/api/tickets/**`, so this QR request does not need an `Authorization` header; this app uses its cookie-enabled Axios client (`withCredentials: true`) and does not attach a bearer token. To confirm the ID, inspect the preceding `GET /api/tickets/booking/{bookingId}` response: `qrCode` includes `/tickets/{ticketId}/qr`. Compare that number with `tickets.ticket_id` in the database; the QR controller passes it to `findById(ticketId)`.
