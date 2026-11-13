import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { LoaderCircle, X } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "./AuthContext";
import { useSendOtp, useVerifyOtp } from "@/hooks/queries";
import { appConfig } from "@/theme/theme";
import { emailIsValid, normalizeOtp, OTP_LENGTH, OTP_RESEND_SECONDS, resendSeconds } from "@/lib/otp";

export function LoginModal() {
  const { loginOpen, closeLogin, login } = useAuth();
  return <Dialog open={loginOpen} onOpenChange={(open) => { if (!open) closeLogin(); }}>
    {loginOpen && <LoginForm onClose={closeLogin} onSuccess={login} />}
  </Dialog>;
}

function LoginForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: ReturnType<typeof useAuth>["login"] }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const shake = useAnimationControls();
  const input = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();
  const send = useSendOtp();
  const verify = useVerifyOtp();
  const busy = send.isPending || verify.isPending;
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setRemaining(resendSeconds(deadline, Date.now()));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => { if (sent) input.current?.focus(); }, [sent]);
  const requestOtp = () => {
    if (!emailIsValid(email)) { setError("Enter a valid email address."); return; }
    setError("");
    send.mutate(email.trim(), {
      onSuccess: () => {
        setSent(true); setOtp(""); setRemaining(OTP_RESEND_SECONDS); setDeadline(Date.now() + OTP_RESEND_SECONDS * 1000);
        input.current?.focus();
      },
      onError: () => setError("Couldn't send the code. Please try again."),
    });
  };

  return <DialogPortal>
    <DialogOverlay className="bg-auth-overlay backdrop-blur-sm" />
    <DialogPrimitive.Content asChild onOpenAutoFocus={(event) => { event.preventDefault(); input.current?.focus(); }} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
      <motion.div initial={{ opacity: 0, scale: reduced ? 1 : .96, x: "-50%", y: "-50%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }} transition={{ duration: reduced ? 0 : .2 }} className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[576px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[24px] bg-surface shadow-auth outline-none">
        <div className="auth-banner relative flex h-[200px] items-center justify-center px-8 max-sm:h-[160px]">
          <p className="break-words text-center text-4xl font-extrabold text-on-primary max-sm:text-3xl">{appConfig.appName}</p>
          <Button variant="ghost" size="icon" aria-label="Close sign in" title="Close" onClick={onClose} className="absolute right-4 top-4 rounded-full text-on-primary hover:bg-on-primary/10 hover:text-on-primary"><X className="size-5" /></Button>
        </div>
        <form className="p-8 text-center max-sm:px-5 max-sm:py-6" noValidate onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            if (!sent) requestOtp();
            else if (otp.length === OTP_LENGTH) {
              setError("");
              verify.mutate({ email: email.trim(), otp }, {
                onSuccess,
                onError: () => { setError("Couldn't verify this code. Please check it and try again."); if (!reduced) void shake.start({ x: [0, -7, 7, -5, 5, 0], transition: { duration: .3 } }); input.current?.focus(); },
              });
            }
          }}>
          <DialogTitle className="text-2xl font-bold leading-8 text-text-primary">{sent ? "Enter OTP" : "Enter your email"}</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-5 text-text-muted">
            {sent ? <>{"We have sent a verification code to "}<span className="break-all text-text-secondary">{email.trim()}</span>{" "}<Button type="button" variant="link" disabled={busy} className="h-auto p-0 text-sm text-accent" onClick={() => { setSent(false); setOtp(""); setError(""); send.reset(); verify.reset(); }}>(Change)</Button></> : "If you don't have an account yet, we'll create one for you"}
          </DialogDescription>
          <div className="mt-7">
            {sent ? <motion.div animate={shake}>
              <InputOTP ref={input} aria-label="Verification code" aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} maxLength={OTP_LENGTH} pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(value) => { setOtp(normalizeOtp(value)); setError(""); }} disabled={busy} containerClassName="w-full justify-center">
                <InputOTPGroup className="grid w-full grid-cols-6 gap-2 sm:gap-3">
                  {Array.from({ length: OTP_LENGTH }, (_, index) => <InputOTPSlot key={index} index={index} className="h-12 w-full min-w-0 rounded-lg border border-subtle bg-surface text-xl font-semibold shadow-none first:rounded-lg last:rounded-lg [&:has([data-caret])]:border-primary" />)}
                </InputOTPGroup>
              </InputOTP>
            </motion.div> : <Input ref={input} type="email" autoComplete="email" aria-label="Email address" aria-invalid={!!error} aria-describedby={error ? "auth-error" : undefined} required placeholder="Enter your email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} onBlur={() => { if (email && !emailIsValid(email)) setError("Enter a valid email address."); }} disabled={busy} className="h-12 rounded-lg border-subtle bg-surface text-base focus-visible:border-primary focus-visible:ring-primary/20" />}
          </div>
          {error && <p id="auth-error" role="alert" className="mt-3 text-left text-sm text-danger">{error}</p>}
          <Button type="submit" className="mt-6 h-[52px] w-full rounded-xl bg-primary text-base font-semibold text-on-primary disabled:bg-auth-disabled disabled:text-text-secondary disabled:opacity-100" disabled={busy || (sent ? otp.length !== OTP_LENGTH : !emailIsValid(email))}>
            {busy && <LoaderCircle className="size-5 animate-spin" />}Continue
          </Button>
          {sent ? <p className="mt-5 text-sm leading-6 text-text-secondary">Didn't get the OTP?{" "}{remaining > 0 ? <span className="text-text-muted">(Request again in 00:{String(remaining).padStart(2, "0")})</span> : <Button variant="link" type="button" disabled={busy} onClick={requestOtp} className="h-auto p-0 text-sm text-accent">Resend OTP</Button>}</p> : <p className="mt-6 text-xs leading-5 text-text-secondary">By continuing, you agree to our{" "}<LegalLink url={appConfig.termsUrl}>Terms of Service</LegalLink>{" and "}<LegalLink url={appConfig.privacyUrl}>Privacy Policy</LegalLink></p>}
        </form>
      </motion.div>
    </DialogPrimitive.Content>
  </DialogPortal>;
}

function LegalLink({ url, children }: { url: string; children: string }) {
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-4">{children}</a> : <span className="underline decoration-dotted underline-offset-4">{children}</span>;
}
