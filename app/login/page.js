"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { getUser, getUserToken, setUserSession } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const ACTIVITIES = ["Go Karting", "Zipline", "AI Cricket"];

export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getUserToken();
    const user = getUser();
    if (token && user) {
      if (user.phone) {
        router.replace("/");
      } else {
        setNeedsPhone(true);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!scriptReady || needsPhone || !buttonRef.current) return;
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      size: "large",
      width: 320,
      text: "continue_with",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, needsPhone]);

  async function handleGoogleCredential(response) {
    setError("");
    try {
      const data = await apiFetch("/auth/google", {
        method: "POST",
        body: { idToken: response.credential },
      });
      setUserSession(data.token, data.user);
      if (data.user.phone) {
        router.replace("/");
      } else {
        setNeedsPhone(true);
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    }
  }

  async function submitPhone(e) {
    e.preventDefault();
    setError("");
    if (!/^[0-9]{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setSaving(true);
    try {
      const token = getUserToken();
      const data = await apiFetch("/auth/phone", {
        method: "POST",
        token,
        body: { phone },
      });
      setUserSession(token, data.user);
      router.replace("/");
    } catch (err) {
      setError(err.message || "Could not save phone number");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      <div className="relative overflow-hidden bg-primary px-6 pt-16 pb-20 text-center text-white">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-35deg, #fff 0, #fff 2px, transparent 2px, transparent 22px)",
          }}
        />
        <div className="relative mx-auto max-w-[420px]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                stroke="#fff"
                strokeWidth="1.6"
              />
              <path d="M8 12h8M8 15.5h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="8.4" cy="8.4" r="1.1" fill="#fff" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight [text-shadow:0_2px_6px_rgba(0,0,0,0.15)]">
            Jalalpur Fun
          </h1>
          <p className="mt-2 text-sm text-white/85">Book your next thrill in seconds</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {ACTIVITIES.map((a) => (
              <span
                key={a}
                className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="-mt-10 flex-1 px-4 pb-10">
        <div className="mx-auto w-full max-w-[420px] rounded-3xl border border-line bg-surface p-6 shadow-xl">
          {!needsPhone && (
            <>
              <p className="mb-4 text-center font-semibold">Sign in to get started</p>
              <div className="flex justify-center">
                <div ref={buttonRef} />
              </div>
            </>
          )}

          {needsPhone && (
            <>
              <p className="mb-4 text-center font-semibold">One last step</p>
              <form onSubmit={submitPhone} className="flex flex-col gap-3">
                <div className="field">
                  <label className="label" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Continue"}
                </button>
              </form>
            </>
          )}

          {error && <p className="error-text mt-3 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
