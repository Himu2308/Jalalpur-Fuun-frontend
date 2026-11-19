"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

export default function AdminWorkersPage() {
  const [staffList, setStaffList] = useState(null);
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({ uid: "", name: "", role: "", canSell: false });
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokedId, setRevokedId] = useState(null);

  useEffect(() => {
    loadStaff();
    apiFetch("/games")
      .then((data) => setGames(data.games))
      .catch(() => {});
  }, []);

  async function loadStaff() {
    try {
      const data = await apiFetch("/staff", { token: getAdminToken() });
      setStaffList(data.staff);
    } catch (err) {
      setError(err.message || "Could not load staff list");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.uid || !form.role) {
      setError("UID and activity are required");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/staff", { method: "POST", token: getAdminToken(), body: form });
      setForm({ uid: "", name: "", role: "", canSell: false });
      loadStaff();
    } catch (err) {
      setError(err.message || "Could not create worker account");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCanSell(worker) {
    setError("");
    setTogglingId(worker.id);
    try {
      const data = await apiFetch(`/staff/${worker.id}`, {
        method: "PATCH",
        token: getAdminToken(),
        body: { canSell: !worker.can_sell },
      });
      setStaffList((list) => list.map((s) => (s.id === worker.id ? { ...s, can_sell: data.staff.can_sell } : s)));
    } catch (err) {
      setError(err.message || "Could not update worker");
    } finally {
      setTogglingId(null);
    }
  }

  async function revokeSessions(staffId) {
    setError("");
    setRevokingId(staffId);
    try {
      await apiFetch(`/staff/${staffId}/revoke`, { method: "POST", token: getAdminToken() });
      setRevokedId(staffId);
      setTimeout(() => setRevokedId(null), 2000);
    } catch (err) {
      setError(err.message || "Could not revoke sessions");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="admin-split">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add worker</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label className="label">UID</label>
            <input className="input" value={form.uid} onChange={(e) => setForm({ ...form, uid: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Assigned activity</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">Select activity</option>
              {games.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--color-primary)]"
              checked={form.canSell}
              onChange={(e) => setForm({ ...form, canSell: e.target.checked })}
            />
            Can sell tickets at the counter
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create worker"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Workers</h3>
        {!staffList && <p className="muted">Loading...</p>}
        {staffList && staffList.length === 0 && <p className="muted">No workers yet.</p>}
        {staffList && staffList.length > 0 && (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name</th>
                  <th>Activity</th>
                  <th>Can sell</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => (
                  <tr key={s.id}>
                    <td>{s.uid}</td>
                    <td>{s.name}</td>
                    <td>{games.find((g) => g.key === s.role)?.name || s.role}</td>
                    <td>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={s.can_sell}
                        aria-label={`Allow ${s.uid} to sell tickets`}
                        className={`worker-switch ${s.can_sell ? "on" : ""}`}
                        onClick={() => toggleCanSell(s)}
                        disabled={togglingId === s.id}
                      >
                        <span />
                      </button>
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-danger"
                        style={{ width: "auto", minHeight: 32, padding: "4px 10px", fontSize: "0.8rem", marginLeft: "auto" }}
                        onClick={() => revokeSessions(s.id)}
                        disabled={revokingId === s.id}
                      >
                        {revokedId === s.id ? "Logged out" : revokingId === s.id ? "..." : "Force logout"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
