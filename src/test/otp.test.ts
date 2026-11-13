import { describe, expect, it } from "vitest";
import { emailIsValid, normalizeOtp, OTP_LENGTH, OTP_RESEND_SECONDS, resendSeconds } from "@/lib/otp";

describe("email OTP rules", () => {
  it("requires six numeric digits and strips nonnumeric pasted characters", () => {
    expect(OTP_LENGTH).toBe(6);
    expect(normalizeOtp("12a3 4567")).toBe("123456");
    expect(normalizeOtp("abc")).toBe("");
  });
  it("allows resending after exactly thirty seconds", () => {
    expect(OTP_RESEND_SECONDS).toBe(30);
    expect(resendSeconds(30_000, 0)).toBe(30);
    expect(resendSeconds(30_000, 29_999)).toBe(1);
    expect(resendSeconds(30_000, 30_000)).toBe(0);
    expect(resendSeconds(30_000, 60_000)).toBe(0);
  });
  it("requires a valid email before requesting a code", () => {
    expect(emailIsValid("user@example.com")).toBe(true);
    expect(emailIsValid("  user@example.com  ")).toBe(true);
    expect(emailIsValid("user")).toBe(false);
    expect(emailIsValid("user@ example.com")).toBe(false);
  });
});