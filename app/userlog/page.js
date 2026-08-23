"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";

const LEVELS = ["beginner", "medium", "expert"];
const INITIAL_RECENT_LIMIT = 5;
const RECENT_LOAD_STEP = 10;

function formatDate(value) {
  if (!value) return "No rides logged";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function UserLogPage() {
  const [phone, setPhone] = useState("");
  const [activeLog, setActiveLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [form, setForm] = useState({ name: "", level: "beginner" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(todayInIndia);
  const [exportEndDate, setExportEndDate] = useState(todayInIndia);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [matchPickerOpen, setMatchPickerOpen] = useState(false);
  const [phoneMatches, setPhoneMatches] = useState([]);
  const [visibleRecentCount, setVisibleRecentCount] = useState(INITIAL_RECENT_LIMIT);

  const cleanPhone = useMemo(() => phone.replace(/\D/g, "").slice(0, 10), [phone]);

  useEffect(() => {
    loadRecentLogs();
  }, []);

  function applyLog(log) {
    setActiveLog(log);
    setForm({
      name: log.name || "",
      level: log.level || "beginner",
    });
  }

  function startNewPerson(targetPhone = cleanPhone) {
    setActiveLog({
      id: null,
      phone: targetPhone,
      name: "",
      rideCount: 0,
      level: "beginner",
      lastRideAt: null,
    });
    setForm({ name: "", level: "beginner" });
  }

  async function loadRecentLogs() {
    try {
      const data = await apiFetch("/user-logs");
      setRecentLogs(data.logs || []);
    } catch (err) {
      setError(err.message || "Could not load user logs");
    }
  }

  async function searchUser(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    if (cleanPhone.length !== 10) {
      setError("Enter exactly 10 digits");
      return;
    }

    setSearching(true);
    try {
      const data = await apiFetch("/user-logs/search", {
        method: "POST",
        body: { phone: cleanPhone },
      });
      if ((data.logs || []).length > 0) {
        setPhoneMatches(data.logs);
        setMatchPickerOpen(true);
        setStatus("Select an existing person or add new");
      } else {
        startNewPerson(data.phone || cleanPhone);
        setStatus("New person log ready");
      }
      await loadRecentLogs();
    } catch (err) {
      setError(err.message || "Could not search phone number");
    } finally {
      setSearching(false);
    }
  }

  async function saveLog(e) {
    e.preventDefault();
    if (!activeLog) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSaveLog() {
    if (!activeLog) return;
    setSaving(true);
    setConfirmOpen(false);
    setError("");
    setStatus("");
    try {
      await apiFetch("/user-logs/save-ride", {
        method: "POST",
        body: { phone: activeLog.phone, name: form.name, level: form.level },
      });
      setActiveLog(null);
      setForm({ name: "", level: "beginner" });
      setStatus("User log saved and ride added after save");
      await loadRecentLogs();
    } catch (err) {
      setError(err.message || "Could not save user log");
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!exportStartDate || !exportEndDate) {
      setError("Choose start and end date to export");
      return;
    }
    if (exportStartDate > exportEndDate) {
      setError("Start date cannot be after end date");
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams({ startDate: exportStartDate, endDate: exportEndDate });
      const link = document.createElement("a");
      link.href = `${API_URL}/user-logs/export?${params.toString()}`;
      link.download = `user-logs-${exportStartDate}-to-${exportEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus("CSV download started");
      setExportOpen(false);
    } catch (err) {
      setError(err.message || "Could not export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>User Log</h1>
        <button
          className="btn btn-secondary"
          type="button"
          title="Export CSV"
          aria-label="Export CSV"
          onClick={() => setExportOpen(true)}
          style={{ width: 40, minHeight: 40, padding: 0, borderRadius: 12 }}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Find by phone</h3>
        <form onSubmit={searchUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label className="label" htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className="input"
              inputMode="tel"
              maxLength={10}
              placeholder="Enter customer phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          <button className="btn" type="submit" disabled={searching || cleanPhone.length !== 10}>
            {searching ? "Searching..." : "Search or create log"}
          </button>
        </form>
      </div>

      {(error || status) && (
        <div className={`status-banner ${error ? "error" : "success"}`} style={{ padding: 14, fontSize: "0.95rem" }}>
          {error || status}
        </div>
      )}

      {activeLog && (
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 style={{ margin: 0 }}>{activeLog.phone}</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Last ride: {formatDate(activeLog.lastRideAt)}
              </p>
            </div>
            <span className="badge unused capitalize">{form.level}</span>
          </div>

          <div className="my-4 rounded-2xl bg-paper p-4 text-center">
            <p className="muted" style={{ margin: 0 }}>Total rides taken</p>
            <strong className="block text-4xl">{activeLog.rideCount}</strong>
          </div>

          <form onSubmit={saveLog} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="name">Name</label>
              <input
                id="name"
                className="input"
                placeholder="Customer name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="level">Level</label>
              <select
                id="level"
                className="input capitalize"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <h3 style={{ margin: 0 }}>Recent logs</h3>
          {recentLogs.length > 0 && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setRecentLogs([]);
                setVisibleRecentCount(INITIAL_RECENT_LIMIT);
                setStatus("Recent logs cleared from this phone");
                setError("");
              }}
              style={{ width: "auto", minHeight: 34, padding: "4px 10px", fontSize: "0.78rem", borderRadius: 12 }}
            >
              Clear logs
            </button>
          )}
        </div>
        {recentLogs.length === 0 ? (
          <p className="muted">No user logs yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentLogs.slice(0, visibleRecentCount).map((log) => (
              <button
                key={log.id}
                className="rounded-2xl border border-line bg-surface p-3 text-left active:bg-paper"
                type="button"
                onClick={() => {
                  setPhone(log.phone);
                  applyLog(log);
                  setError("");
                  setStatus("");
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong>{log.name || log.phone}</strong>
                  <span className="text-sm font-bold">{log.rideCount} rides</span>
                </div>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {log.name ? log.phone : "Name not added"} · {log.level}
                </p>
              </button>
            ))}
            {visibleRecentCount < recentLogs.length && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setVisibleRecentCount((count) => count + RECENT_LOAD_STEP)}
              >
                View more
              </button>
            )}
          </div>
        )}
      </div>

      {matchPickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-4 shadow-xl">
            <h3 style={{ marginTop: 0 }}>Select person</h3>
            <p className="muted">
              This phone number already has these names. Choose one to add a ride, or add a new person.
            </p>
            <div className="mt-3 flex max-h-[50dvh] flex-col gap-2 overflow-auto">
              {phoneMatches.map((log) => (
                <button
                  key={log.id}
                  className="rounded-2xl border border-line bg-surface p-3 text-left active:bg-paper"
                  type="button"
                  onClick={() => {
                    applyLog(log);
                    setMatchPickerOpen(false);
                    setError("");
                    setStatus("Existing person selected");
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong>{log.name || "Name not added"}</strong>
                    <span className="text-sm font-bold">{log.rideCount} rides</span>
                  </div>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {log.level} · Last ride: {formatDate(log.lastRideAt)}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn btn-secondary" type="button" onClick={() => setMatchPickerOpen(false)}>
                Cancel
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  startNewPerson(phoneMatches[0]?.phone || cleanPhone);
                  setMatchPickerOpen(false);
                  setError("");
                  setStatus("New person log ready");
                }}
              >
                Add new
              </button>
            </div>
          </div>
        </div>
      )}

      {exportOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-4 shadow-xl">
            <h3 style={{ marginTop: 0 }}>Export CSV</h3>
            <form onSubmit={exportCsv} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label className="label" htmlFor="export-start-date">Start date</label>
                <input
                  id="export-start-date"
                  className="input"
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="export-end-date">End date</label>
                <input
                  id="export-end-date"
                  className="input"
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setExportOpen(false)}
                  disabled={exporting}
                >
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={exporting || !exportStartDate || !exportEndDate}>
                  {exporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmOpen && activeLog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-4 shadow-xl">
            <h3 style={{ marginTop: 0 }}>Confirm save</h3>
            <p className="muted">
              Save <strong>{form.name}</strong> and add 1 ride to this log?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="btn" type="button" onClick={confirmSaveLog} disabled={saving}>
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
