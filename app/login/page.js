"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { getUser, getUserToken, setUserSession } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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
    <div className="page" style={{ justifyContent: "center" }}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div className="card" style={{ textAlign: "center" }}>
        <h1 style={{ marginTop: 0 }}>Jalalpur Fun</h1>
        <p className="muted">Book GoKarting, Zipline, AI Cricket and more</p>

        {!needsPhone && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <div ref={buttonRef} />
          </div>
        )}

        {needsPhone && (
          <form onSubmit={submitPhone} style={{ marginTop: 20, textAlign: "left" }}>
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
            <button className="btn" type="submit" disabled={saving} style={{ marginTop: 12 }}>
              {saving ? "Saving..." : "Continue"}
            </button>
          </form>
        )}

        {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
