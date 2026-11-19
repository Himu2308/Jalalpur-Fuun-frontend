"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { todayISO } from "@/components/counter/format";

const STATUSES = [
  { key: "present", short: "P", label: "Present" },
  { key: "absent", short: "A", label: "Absent" },
  { key: "half_day", short: "HD", label: "Half day" },
  { key: "leave", short: "L", label: "Leave" },
  { key: "week_off", short: "WO", label: "Week off" },
];
const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function prettyDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function toEntry(row) {
  return { status: row.status || null, checkIn: row.check_in || "", checkOut: row.check_out || "", note: row.note || "" };
}

function DailyRegister({ date, setDate: changeDate }) {
  const [workers, setWorkers] = useState(null);
  const [saved, setSaved] = useState({}); // staffId -> entry as stored on the server
  const [draft, setDraft] = useState({}); // staffId -> entry being edited
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    setWorkers(null);
    setError("");
    setSavedAt(null);
    apiFetch(`/attendance?date=${date}`, { token: getAdminToken() })
      .then((data) => {
        if (cancelled) return;
        const entries = Object.fromEntries(data.workers.map((w) => [w.staff_id, toEntry(w)]));
        setWorkers(data.workers);
        setSaved(entries);
        setDraft(entries);
      })
      .catch((err) => !cancelled && setError(err.message || "Could not load attendance"));
    return () => {
      cancelled = true;
    };
  }, [date]);

  const changedIds = useMemo(
    () => Object.keys(draft).filter((id) => JSON.stringify(draft[id]) !== JSON.stringify(saved[id])),
    [draft, saved]
  );
  const counts = useMemo(() => {
    const result = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
    let unmarked = 0;
    for (const entry of Object.values(draft)) {
      if (entry.status) result[entry.status] += 1;
      else unmarked += 1;
    }
    return { ...result, unmarked };
  }, [draft]);

  function setDate(next) {
    if (next === date) return;
    if (changedIds.length > 0 && !window.confirm("You have unsaved attendance changes. Discard them?")) return;
    changeDate(next);
  }

  function update(staffId, patch) {
    setDraft((current) => ({ ...current, [staffId]: { ...current[staffId], ...patch } }));
  }

  function markAllUnmarkedPresent() {
    setDraft((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, entry]) => [id, entry.status ? entry : { ...entry, status: "present" }])
      )
    );
  }

  async function save() {
    setError("");
    for (const id of changedIds) {
      const entry = draft[id];
      if (entry.checkIn && entry.checkOut && entry.checkOut <= entry.checkIn) {
        const worker = workers.find((w) => String(w.staff_id) === id);
        return setError(`${worker?.uid}: out time must be after in time`);
      }
    }
    setSaving(true);
    try {
      await apiFetch("/attendance", {
        method: "PUT",
        token: getAdminToken(),
        body: {
          date,
          entries: changedIds.map((id) => ({
            staffId: id,
            status: draft[id].status,
            checkIn: draft[id].checkIn || null,
            checkOut: draft[id].checkOut || null,
            note: draft[id].note || null,
          })),
        },
      });
      setSaved(draft);
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message || "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-2">
        <button className="att-nav" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
        <input className="input w-auto" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button className="att-nav" onClick={() => setDate(shiftDate(date, 1))} disabled={date >= today} aria-label="Next day">›</button>
        <span className="ml-1 font-semibold">{prettyDate(date)}</span>
        {date !== today && (
          <button className="btn btn-secondary ml-auto w-auto px-3" style={{ minHeight: 36 }} onClick={() => setDate(today)}>
            Today
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <span key={s.key} className={`att-chip att-${s.key}`}>{s.label}: {counts[s.key]}</span>
        ))}
        <span className="att-chip">Not marked: {counts.unmarked}</span>
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0">Register</h3>
          {workers && counts.unmarked > 0 && (
            <button className="btn btn-secondary w-auto px-3" style={{ minHeight: 36, fontSize: "0.85rem" }} onClick={markAllUnmarkedPresent}>
              Mark all unmarked as present
            </button>
          )}
        </div>

        {!workers && !error && <p className="muted">Loading...</p>}
        {workers && workers.length === 0 && <p className="muted">No workers yet. Add them in Workers.</p>}

        <div className="flex flex-col">
          {workers?.map((w) => {
            const entry = draft[w.staff_id];
            const worked = entry.status === "present" || entry.status === "half_day";
            const changed = changedIds.includes(String(w.staff_id));
            return (
              <div key={w.staff_id} className={`att-row ${changed ? "changed" : ""}`}>
                <div className="att-worker">
                  <strong>{w.name || w.uid}</strong>
                  <span className="muted text-xs">{w.uid} · {w.role.replace(/_/g, " ")}</span>
                </div>

                <div className="att-status-group" role="radiogroup" aria-label={`Attendance for ${w.uid}`}>
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      role="radio"
                      aria-checked={entry.status === s.key}
                      title={s.label}
                      className={`att-status att-${s.key} ${entry.status === s.key ? "active" : ""}`}
                      onClick={() => update(w.staff_id, { status: entry.status === s.key ? null : s.key })}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>

                <div className="att-extra">
                  <label className="att-time">
                    In
                    <input type="time" className="input" value={entry.checkIn} disabled={!worked} onChange={(e) => update(w.staff_id, { checkIn: e.target.value })} />
                  </label>
                  <label className="att-time">
                    Out
                    <input type="time" className="input" value={entry.checkOut} disabled={!worked} onChange={(e) => update(w.staff_id, { checkOut: e.target.value })} />
                  </label>
                  <input
                    className="input att-note"
                    placeholder="Note (optional)"
                    value={entry.note}
                    maxLength={200}
                    onChange={(e) => update(w.staff_id, { note: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="error-text">{error}</p>}
        {workers && workers.length > 0 && (
          <div className="att-savebar">
            <span className="muted text-sm">
              {changedIds.length > 0
                ? `${changedIds.length} unsaved change${changedIds.length > 1 ? "s" : ""}`
                : savedAt
                  ? `Saved at ${savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                  : "All changes saved"}
            </span>
            <button className="btn w-auto px-6" onClick={save} disabled={saving || changedIds.length === 0}>
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlyReport({ openDay }) {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    apiFetch(`/attendance/month?month=${month}`, { token: getAdminToken() })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message || "Could not load report"));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const days = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
      const weekday = new Date(y, m - 1, i + 1).getDay();
      return { iso, day: i + 1, weekday, isSunday: weekday === 0 };
    });
  }, [month]);
  const today = todayISO();

  function exportCsv() {
    const header = ["UID", "Name", "Activity", ...days.map((d) => d.day), "Present", "Absent", "Half day", "Leave", "Week off", "Days worked"];
    const rows = data.workers.map((w) => [
      w.uid,
      w.name || "",
      w.role,
      ...days.map((d) => (w.days[d.iso] ? STATUS_BY_KEY[w.days[d.iso].status].short : "")),
      w.totals.present,
      w.totals.absent,
      w.totals.half_day,
      w.totals.leave,
      w.totals.week_off,
      w.totals.daysWorked,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="field">
          <label className="label" htmlFor="att-month">Month</label>
          <input id="att-month" className="input w-auto" type="month" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.map((s) => (
            <span key={s.key} className={`att-chip att-${s.key}`}>{s.short} = {s.label}</span>
          ))}
        </div>
        <button className="btn btn-secondary ml-auto w-auto px-4" style={{ minHeight: 44 }} onClick={exportCsv} disabled={!data}>
          Export CSV
        </button>
      </div>

      <div className="card">
        {error && <p className="error-text">{error}</p>}
        {!data && !error && <p className="muted">Loading...</p>}
        {data && data.workers.length === 0 && <p className="muted">No workers yet.</p>}
        {data && data.workers.length > 0 && (
          <>
            <p className="muted mt-0 text-xs">Tap a date to open that day&apos;s register. Days worked = Present + ½ × Half day.</p>
            <div className="overflow-x-auto">
              <table className="att-grid">
                <thead>
                  <tr>
                    <th className="att-sticky">Worker</th>
                    {days.map((d) => (
                      <th key={d.iso} className={d.isSunday ? "att-sunday" : ""}>
                        <button className="att-day-btn" onClick={() => openDay(d.iso)} disabled={d.iso > today}>
                          {d.day}
                          <small>{"SMTWTFS"[d.weekday]}</small>
                        </button>
                      </th>
                    ))}
                    <th>P</th>
                    <th>A</th>
                    <th>HD</th>
                    <th>L</th>
                    <th>WO</th>
                    <th>Worked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.map((w) => (
                    <tr key={w.staffId}>
                      <td className="att-sticky">
                        <div className="whitespace-nowrap font-semibold">{w.name || w.uid}</div>
                        <div className="muted text-[0.7rem]">{w.uid}</div>
                      </td>
                      {days.map((d) => {
                        const mark = w.days[d.iso];
                        const info = mark && STATUS_BY_KEY[mark.status];
                        const tip = mark
                          ? [info.label, mark.checkIn && `${mark.checkIn}–${mark.checkOut || "?"}`, mark.note].filter(Boolean).join(" · ")
                          : undefined;
                        return (
                          <td key={d.iso} className={d.isSunday ? "att-sunday" : ""} title={tip}>
                            {info ? <span className={`att-cell att-${mark.status}`}>{info.short}</span> : <span className="att-cell-empty">·</span>}
                          </td>
                        );
                      })}
                      <td className="font-semibold">{w.totals.present}</td>
                      <td className="font-semibold">{w.totals.absent}</td>
                      <td className="font-semibold">{w.totals.half_day}</td>
                      <td className="font-semibold">{w.totals.leave}</td>
                      <td className="font-semibold">{w.totals.week_off}</td>
                      <td className="font-bold">{w.totals.daysWorked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminAttendancePage() {
  const [view, setView] = useState("daily");
  const [date, setDate] = useState(todayISO());

  return (
    <div className="flex flex-col gap-4">
      <div className="grid w-full max-w-[360px] grid-cols-2 gap-1.5 rounded-2xl border border-line bg-surface p-1">
        {[
          ["daily", "Daily register"],
          ["monthly", "Monthly report"],
        ].map(([key, label]) => (
          <button key={key} type="button" className={`counter-segment ${view === key ? "active" : ""}`} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </div>

      {view === "daily" ? (
        <DailyRegister date={date} setDate={setDate} />
      ) : (
        <MonthlyReport
          openDay={(iso) => {
            setDate(iso);
            setView("daily");
          }}
        />
      )}
    </div>
  );
}
