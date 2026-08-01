"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearWorkerSession, getWorker, getWorkerToken, setWorkerSession } from "@/lib/auth";
import QrScanner from "@/components/QrScanner";

const RESULT_DISPLAY_MS = 2500;

export default function StaffLoginPage() {
  const [worker, setWorker] = useState(null);
  const [uid, setUid] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [result, setResult] = useState(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const token = getWorkerToken();
    const currentWorker = getWorker();
    if (token && currentWorker) setWorker(currentWorker);
  }, []);

  const onScan = useCallback(async (qrToken) => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const token = getWorkerToken();
      const data = await apiFetch("/tickets/scan", {
        method: "POST",
        token,
        body: { qrToken },
      });
      setResult({ ok: true, message: `Valid — ${data.gameName}` });
    } catch (err) {
      setResult({ ok: false, message: err.data?.message || err.message || "Invalid ticket" });
    } finally {
      setTimeout(() => {
        setResult(null);
        busyRef.current = false;
      }, RESULT_DISPLAY_MS);
    }
  }, []);

  async function login(e) {
    e.preventDefault();
    setLoginError("");
    if (!uid.trim()) {
      setLoginError("Enter your UID");
      return;
    }
    setLoggingIn(true);
    try {
      const data = await apiFetch("/auth/worker-login", { method: "POST", body: { uid: uid.trim() } });
      setWorkerSession(data.token, data.worker);
      setWorker(data.worker);
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await apiFetch("/auth/worker-logout", { method: "POST", token: getWorkerToken() });
    } catch (err) {
      // ignore — clear the local session either way
    }
    clearWorkerSession();
    setWorker(null);
    setUid("");
  }

  if (!worker) {
    return (
      <div className="page justify-center">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl">
          <div className="relative bg-navy px-6 pt-9 pb-8 text-center text-white">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)",
              }}
            />
            <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                  stroke="#e8a33d"
                  strokeWidth="1.6"
                />
                <path d="M8 12h8M8 15.5h5" stroke="#e8a33d" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="8.4" cy="8.4" r="1.1" fill="#e8a33d" />
              </svg>
            </div>
            <p className="relative text-[0.68rem] font-bold tracking-[0.18em] text-white/60 uppercase">
              Staff Access
            </p>
            <h1 className="relative mt-1 text-xl font-extrabold">Gate Scanner Login</h1>
          </div>

          <form onSubmit={login} className="flex flex-col gap-3 p-6">
            <div className="field">
              <label className="label" htmlFor="uid">
                Your UID
              </label>
              <input
                id="uid"
                className="input text-center font-mono text-lg tracking-[0.2em] uppercase"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                autoCapitalize="none"
                placeholder="e.g. KART001"
              />
            </div>
            {loginError && <p className="error-text text-center">{loginError}</p>}
            <button className="btn" type="submit" disabled={loggingIn}>
              {loggingIn ? "Signing in..." : "Sign In"}
            </button>
            <p className="muted text-center text-xs">Don&apos;t have a UID? Ask your admin to create one.</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-bar">
        <div className="flex items-center gap-2">
          <h1>Scanner</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary capitalize">
            {worker.role.replace(/_/g, " ")}
          </span>
        </div>
        <button className="btn btn-secondary h-auto min-h-9 w-auto px-3 py-1.5" onClick={logout}>
          Logout
        </button>
      </div>

      {result && (
        <div className={`status-banner ${result.ok ? "success" : "error"}`}>{result.message}</div>
      )}

      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="border-b border-line bg-paper px-4 py-2.5 text-center">
          <p className="muted">Scan a ticket&apos;s QR code</p>
        </div>
        <div className="p-4">
          <QrScanner onScan={onScan} />
        </div>
      </div>
    </div>
  );
}
