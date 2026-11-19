"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import QrScanner from "@/components/QrScanner";

const RESULT_DISPLAY_MS = 2500;

export default function AdminScanPage() {
  const [scanResult, setScanResult] = useState(null);
  const [manualTicketCode, setManualTicketCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const busyRef = useRef(false);

  const onScan = useCallback(async (qrToken) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const data = await apiFetch("/tickets/scan", {
        method: "POST",
        token: getAdminToken(),
        body: { qrToken },
      });
      setScanResult({ ok: true, message: `Valid — ${data.gameName}` });
    } catch (err) {
      setScanResult({ ok: false, message: err.data?.message || err.message || "Invalid ticket" });
    } finally {
      setTimeout(() => {
        setScanResult(null);
        busyRef.current = false;
      }, RESULT_DISPLAY_MS);
    }
  }, []);

  async function submitManualTicketCode(e) {
    e.preventDefault();
    const code = manualTicketCode.trim();
    if (!code) {
      setScanResult({ ok: false, message: "Enter the code shown below the customer QR ticket" });
      return;
    }

    setValidatingCode(true);
    await onScan(code);
    setValidatingCode(false);
    setManualTicketCode("");
  }

  return (
    <div className="mx-auto w-full max-w-[520px]">
      <div className="card">
        <p className="muted mt-0">Admin can validate a ticket for any activity, unlike workers.</p>

        {scanResult && (
          <div className={`status-banner ${scanResult.ok ? "success" : "error"}`} style={{ marginBottom: 12 }}>
            {scanResult.message}
          </div>
        )}

        <QrScanner onScan={onScan} />

        <div className="my-5 flex items-center gap-3 text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted/60">
          <span className="h-px flex-1 bg-line" />
          <span>CAMERA NOT WORKING?</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submitManualTicketCode} className="rounded-2xl border border-line bg-paper p-3.5">
          <label className="mb-1 block text-sm font-bold text-ink" htmlFor="manual-ticket-code">
            Validate with ticket code
          </label>
          <p className="muted mb-3 text-xs">
            Enter the code printed below the customer&apos;s QR, for example <strong>#WX8AOLTW</strong>.
          </p>
          <div className="flex gap-2">
            <input
              id="manual-ticket-code"
              className="input min-w-0 flex-1 text-center font-mono tracking-[0.12em] uppercase"
              value={manualTicketCode}
              onChange={(e) => setManualTicketCode(e.target.value.replace(/\s/g, "").slice(0, 25))}
              placeholder="#WX8AOLTW"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="btn w-auto shrink-0 px-4"
              type="submit"
              disabled={validatingCode || !manualTicketCode.trim()}
            >
              {validatingCode ? "Checking…" : "Validate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
