"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearWorkerSession, getWorker, getWorkerToken, setWorkerSession } from "@/lib/auth";

const SCANNER_ELEMENT_ID = "qr-reader";
const RESULT_DISPLAY_MS = 2500;

export default function StaffLoginPage() {
  const [worker, setWorker] = useState(null);
  const [uid, setUid] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const token = getWorkerToken();
    const currentWorker = getWorker();
    if (token && currentWorker) setWorker(currentWorker);
  }, []);

  const onScanSuccess = useCallback(async (qrToken) => {
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

  useEffect(() => {
    if (!worker) return undefined;

    let scanner;
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      scanner = new Html5QrcodeScanner(SCANNER_ELEMENT_ID, { fps: 10, qrbox: 240 }, false);
      scanner.render(onScanSuccess, () => {});
      scannerRef.current = scanner;
    });

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, [worker, onScanSuccess]);

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
      <div className="page" style={{ justifyContent: "center" }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Staff Login</h1>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="uid">
                UID
              </label>
              <input
                id="uid"
                className="input"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                autoCapitalize="none"
              />
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button className="btn" type="submit" disabled={loggingIn}>
              {loggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Scan · {worker.role}</h1>
        <button
          className="btn btn-secondary"
          style={{ width: "auto", minHeight: 36, padding: "6px 12px" }}
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {result && (
        <div className={`status-banner ${result.ok ? "success" : "error"}`}>{result.message}</div>
      )}

      <div id={SCANNER_ELEMENT_ID} />
    </div>
  );
}
