import { appConfig } from "@/theme/theme";
import { http } from "./http";
import type { Booking } from "./bookings";
import { getBooking, setMockBookingStatus } from "./bookings";
import { updateProfile as updateUserProfile } from "./api";

export interface PaymentOrder { orderId: string; currency: string; amount: number; keyId: string; bookingId: string | number }
export interface PaymentVerification { status: "SUCCESS"; message: string; booking: Booking }

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 180));
export const createOrder = async (bookingId: string | number) => appConfig.useMock ? delay({ orderId: `test-${bookingId}`, currency: "INR", amount: (await getBooking(bookingId)).totalAmount * 100, keyId: "test_key", bookingId }) : http.post<PaymentOrder>("/payments/create-order", { bookingId }).then((r) => r.data);
export const verifyPayment = (input: { bookingId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
  if (!appConfig.useMock) return http.post<PaymentVerification>("/payments/verify-payment", input).then((r) => r.data);
  return getBooking(input.bookingId).then(async (booking) => { setMockBookingStatus(input.bookingId, "CONFIRMED"); return delay({ status: "SUCCESS" as const, message: "Payment confirmed", booking: { ...booking, bookingStatus: "CONFIRMED" } }); });
};
export const updateProfile = updateUserProfile;

export function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string" && response.data.message) return response.data.message;
  }
  return error instanceof Error && error.message ? error.message : "Something went wrong. Please try again.";
}
