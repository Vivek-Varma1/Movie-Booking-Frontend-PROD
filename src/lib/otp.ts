export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 30;
export const emailIsValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const normalizeOtp = (value: string) => value.replace(/\D/g, "").slice(0, OTP_LENGTH);
export const resendSeconds = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000));