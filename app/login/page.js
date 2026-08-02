"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { getUser, getUserToken, setUserSession } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function TicketMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 56 56" className="h-9 w-9">
      <path d="M12 11h32a4 4 0 0 1 4 4v7a6 6 0 0 0 0 12v7a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-7a6 6 0 0 0 0-12v-7a4 4 0 0 1 4-4Z" fill="currentColor" />
      <path d="M28 15v26M19 28h18" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 6" />
      <circle cx="20" cy="28" r="5" fill="#7c2d12" />
      <path d="m18 28 1.5 1.5L22.5 26" fill="none" stroke="#fff7ed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdventureScene() {
  return (
    <div className="login-scene" aria-hidden="true">
      <span className="login-cloud login-cloud-one" />
      <span className="login-cloud login-cloud-two" />
      <span className="login-sun" />
      <svg viewBox="0 0 390 170" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
        <path d="M0 124 72 73l44 36 50-58 66 67 54-43 104 54v41H0Z" fill="#9a3412" opacity=".48" />
        <path d="M0 142 76 104l51 27 67-52 65 58 65-32 66 33v32H0Z" fill="#431407" opacity=".62" />
        <path d="M273 127c5-25 16-43 31-43s26 18 30 43" fill="none" stroke="#fdba74" strokeWidth="3" />
        <path d="M303 84v45M279 108h50M285 95l38 27M323 95l-38 27" stroke="#fdba74" strokeWidth="2" />
        <circle cx="304" cy="84" r="4" fill="#ffedd5" />
        <path d="m57 135 15-25 15 25M62 126h20M72 110v-9" fill="none" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" />
        <path d="M71 100c9 0 13-6 13-6" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const token = getUserToken();
    const user = getUser();
    if (token && user) {
      if (user.phone) router.replace("/");
      else setNeedsPhone(true);
    }
  }, [router]);

  useEffect(() => {
    if (!scriptReady || needsPhone || !buttonRef.current || !window.google || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      shape: "pill",
      size: "large",
      width: Math.min(344, window.innerWidth - 72),
      text: "continue_with",
      logo_alignment: "left",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, needsPhone]);

  async function handleGoogleCredential(response) {
    setError("");
    setSigningIn(true);
    try {
      const data = await apiFetch("/auth/google", {
        method: "POST",
        body: { idToken: response.credential },
      });
      setUserSession(data.token, data.user);
      if (data.user.phone) router.replace("/");
      else setNeedsPhone(true);
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  async function submitPhone(event) {
    event.preventDefault();
    setError("");
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setSaving(true);
    try {
      const token = getUserToken();
      const data = await apiFetch("/auth/phone", { method: "POST", token, body: { phone } });
      setUserSession(token, data.user);
      router.replace("/");
    } catch (err) {
      setError(err.message || "Could not save your number. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-page">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setError("Could not load Google sign-in. Check your connection and try again.")}
      />

      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <section className="relative z-10 flex min-h-dvh w-full max-w-[460px] flex-col px-5 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
        <header className="login-brand login-reveal">
          <span className="login-logo"><TicketMark /></span>
          <span>
            <strong>Jalalpur Fun</strong>
            <small>ADVENTURE PARK</small>
          </span>
        </header>

        <div className="login-hero login-reveal login-delay-one">
          <span className="login-kicker"><i /> YOUR ADVENTURE STARTS HERE</span>
          <h1>{needsPhone ? <>Almost there! <em>One last step.</em></> : <>Less waiting.<br /><em>More thrilling.</em></>}</h1>
          <p>{needsPhone ? "Add your mobile number so we can keep your tickets and booking updates together." : "Sign in once, book in seconds, and keep every ticket right in your pocket."}</p>
        </div>

        <AdventureScene />

        <section className="login-card login-reveal login-delay-two" aria-live="polite">
          {!needsPhone ? (
            <>
              <div className="login-card-heading">
                <h2>Welcome, thrill seeker!</h2>
                <p>Continue to explore the fun</p>
              </div>

              <div className="google-button-wrap">
                {!scriptReady && !error && <div className="google-button-skeleton"><span className="login-spinner" /> Loading secure sign-in…</div>}
                {signingIn && <div className="login-button-overlay"><span className="login-spinner" /> Signing you in…</div>}
                <div ref={buttonRef} className={scriptReady ? "" : "hidden"} />
              </div>

              {!GOOGLE_CLIENT_ID && <p className="login-error">Google sign-in needs a client ID in the app configuration.</p>}
              <div className="login-divider"><span>QUICK • EASY • SECURE</span></div>
              <div className="login-perks">
                <span><i>✓</i> Instant tickets</span>
                <span><i>✓</i> Easy rebooking</span>
                <span><i>✓</i> Secure checkout</span>
              </div>
            </>
          ) : (
            <form onSubmit={submitPhone} className="login-phone-form">
              <div className="login-card-heading">
                <span className="login-step-check">✓</span>
                <h2>Google sign-in complete</h2>
                <p>Where should we send booking updates?</p>
              </div>
              <label htmlFor="phone">Mobile number</label>
              <div className="login-phone-input">
                <span>+91</span>
                <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} autoFocus />
              </div>
              <button className="login-continue" type="submit" disabled={saving}>
                {saving ? <><span className="login-spinner" /> Saving…</> : <>Start exploring <span>→</span></>}
              </button>
            </form>
          )}

          {error && <p className="login-error" role="alert">{error}</p>}
          <p className="login-legal">By continuing, you agree to our <a href="/terms">Terms</a> &amp; <a href="/privacy">Privacy Policy</a>.</p>
        </section>

        <p className="login-footer login-reveal login-delay-three">Made for fun-filled days in Jalalpur <span>♥</span></p>
      </section>
    </main>
  );
}
