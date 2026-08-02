"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearAdminSession, getAdminToken, setAdminSession } from "@/lib/auth";
import QrScanner from "@/components/QrScanner";

const RESULT_DISPLAY_MS = 2500;

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [staffList, setStaffList] = useState(null);
  const [scans, setScans] = useState(null);
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({ uid: "", name: "", role: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokedId, setRevokedId] = useState(null);

  const [gameForm, setGameForm] = useState({ name: "", pricePerPerson: "", imageUrl: "" });
  const [gameError, setGameError] = useState("");
  const [savingGame, setSavingGame] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState(null);

  const [expandedGameId, setExpandedGameId] = useState(null);
  const [activityForm, setActivityForm] = useState({ name: "", pricePerPerson: "", imageUrl: "" });
  const [activityError, setActivityError] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [variantForm, setVariantForm] = useState({ mode: "single", laps: "", pricePerPerson: "" });
  const [variantError, setVariantError] = useState("");
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState(null);

  const [scanResult, setScanResult] = useState(null);
  const [manualTicketCode, setManualTicketCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (getAdminToken()) setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadStaff();
    loadScans();
    loadGames();
  }, [authed]);

  async function loadGames() {
    const data = await apiFetch("/games");
    setGames(data.games);
  }

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
      loadScans();
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

  async function loadStaff() {
    try {
      const data = await apiFetch("/staff", { token: getAdminToken() });
      setStaffList(data.staff);
    } catch (err) {
      setError(err.message || "Could not load staff list");
    }
  }

  async function loadScans() {
    try {
      const data = await apiFetch("/staff/scans", { token: getAdminToken() });
      setScans(data.scans);
    } catch (err) {
      // non-critical
    }
  }

  async function login(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const data = await apiFetch("/auth/admin-login", { method: "POST", body: { password } });
      setAdminSession(data.token);
      setAuthed(true);
    } catch (err) {
      setLoginError(err.message || "Invalid password");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await apiFetch("/auth/admin-logout", { method: "POST", token: getAdminToken() });
    } catch (err) {
      // ignore — clear the local session either way
    }
    clearAdminSession();
    setAuthed(false);
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
      setForm({ uid: "", name: "", role: "" });
      loadStaff();
    } catch (err) {
      setError(err.message || "Could not create worker account");
    } finally {
      setSaving(false);
    }
  }

  async function submitGame(e) {
    e.preventDefault();
    setGameError("");
    const price = Number(gameForm.pricePerPerson);
    if (!gameForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      setGameError("Name and a positive price per person are required");
      return;
    }
    setSavingGame(true);
    try {
      await apiFetch("/games", {
        method: "POST",
        token: getAdminToken(),
        body: { name: gameForm.name.trim(), pricePerPerson: price, imageUrl: gameForm.imageUrl.trim() || null },
      });
      setGameForm({ name: "", pricePerPerson: "", imageUrl: "" });
      loadGames();
    } catch (err) {
      setGameError(err.message || "Could not add activity");
    } finally {
      setSavingGame(false);
    }
  }

  async function deleteGame(game) {
    const confirmed = window.confirm(
      `Permanently delete "${game.name}" from the database?\n\nDeletion is allowed only if it has no booking history.`
    );
    if (!confirmed) return;

    setGameError("");
    setDeletingGameId(game.id);
    try {
      await apiFetch(`/games/${game.id}`, {
        method: "DELETE",
        token: getAdminToken(),
      });
      if (expandedGameId === game.id) setExpandedGameId(null);
      await loadGames();
    } catch (err) {
      setGameError(err.message || "Could not remove activity");
    } finally {
      setDeletingGameId(null);
    }
  }

  function toggleExpand(game) {
    const opening = expandedGameId !== game.id;
    setExpandedGameId(opening ? game.id : null);
    if (opening) {
      setActivityForm({
        name: game.name,
        pricePerPerson: String(game.price_per_person),
        imageUrl: game.image_url || "",
      });
    }
    setActivityError("");
    setVariantForm({ mode: "single", laps: "", pricePerPerson: "" });
    setVariantError("");
  }

  async function saveActivity(e, game) {
    e.preventDefault();
    setActivityError("");
    const price = Number(activityForm.pricePerPerson);
    if (!activityForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      setActivityError("Name and a positive base price are required");
      return;
    }

    setSavingActivity(true);
    try {
      await apiFetch(`/games/${game.id}`, {
        method: "PATCH",
        token: getAdminToken(),
        body: {
          name: activityForm.name.trim(),
          pricePerPerson: price,
          imageUrl: activityForm.imageUrl.trim() || null,
        },
      });
      await loadGames();
    } catch (err) {
      setActivityError(err.message || "Could not update activity");
    } finally {
      setSavingActivity(false);
    }
  }

  async function submitVariant(e, game) {
    e.preventDefault();
    setVariantError("");
    const laps = Number(variantForm.laps);
    const price = Number(variantForm.pricePerPerson);
    if (!variantForm.mode || !Number.isInteger(laps) || laps <= 0 || !Number.isFinite(price) || price <= 0) {
      setVariantError("Mode, a positive lap count, and a positive price per person are required");
      return;
    }
    setSavingVariant(true);
    try {
      await apiFetch(`/games/${game.id}/variants`, {
        method: "POST",
        token: getAdminToken(),
        body: { mode: variantForm.mode, laps, pricePerPerson: price },
      });
      setVariantForm({ mode: "single", laps: "", pricePerPerson: "" });
      loadGames();
    } catch (err) {
      setVariantError(err.message || "Could not add variant");
    } finally {
      setSavingVariant(false);
    }
  }

  async function deleteVariant(game, variantId) {
    setDeletingVariantId(variantId);
    try {
      await apiFetch(`/games/${game.id}/variants/${variantId}`, {
        method: "DELETE",
        token: getAdminToken(),
      });
      loadGames();
    } catch (err) {
      setVariantError(err.message || "Could not remove variant");
    } finally {
      setDeletingVariantId(null);
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

  if (!authed) {
    return (
      <div className="page" style={{ justifyContent: "center" }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Admin</h1>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {loginError && <p className="error-text">{loginError}</p>}
            <button className="btn" type="submit" disabled={loggingIn}>
              {loggingIn ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Admin</h1>
        <button
          className="btn btn-secondary"
          style={{ width: "auto", minHeight: 36, padding: "6px 12px" }}
          onClick={logout}
        >
          Logout
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Scan any ticket</h3>
        <p className="muted">Admin can validate a ticket for any activity, unlike workers.</p>

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

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add activity</h3>
        <form onSubmit={submitGame} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="e.g. Bungee Jumping"
              value={gameForm.name}
              onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Price per person (INR)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={gameForm.pricePerPerson}
              onChange={(e) => setGameForm({ ...gameForm, pricePerPerson: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Image URL</label>
            <input
              className="input"
              placeholder="https://..."
              value={gameForm.imageUrl}
              onChange={(e) => setGameForm({ ...gameForm, imageUrl: e.target.value })}
            />
          </div>
          {gameError && <p className="error-text">{gameError}</p>}
          <button className="btn" type="submit" disabled={savingGame}>
            {savingGame ? "Saving..." : "Add activity"}
          </button>
        </form>

        {games.length > 0 && (
          <div className="flex flex-col gap-2.5" style={{ marginTop: 18 }}>
            {games.map((g) => (
              <div className="card" key={g.key} style={{ padding: 10 }}>
                <div className="game-card">
                  <div className="info" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {g.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.image_url}
                        alt={g.name}
                        style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover" }}
                      />
                    )}
                    <div>
                      <h3 style={{ fontSize: "0.95rem" }}>{g.name}</h3>
                      <p className="muted" style={{ margin: 0 }}>
                        {g.variants.length > 0
                          ? `${g.variants.length} pricing tier${g.variants.length > 1 ? "s" : ""}`
                          : `₹${Number(g.price_per_person).toFixed(0)} / person`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      className="btn btn-secondary"
                      style={{ width: "auto", minHeight: 32, padding: "4px 10px", fontSize: "0.72rem" }}
                      onClick={() => toggleExpand(g)}
                      disabled={deletingGameId === g.id}
                    >
                      {expandedGameId === g.id ? "Close" : "Manage activity"}
                    </button>
                    <button
                      className="flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 text-[0.7rem] font-bold text-red-700 active:bg-red-100 disabled:opacity-50"
                      onClick={() => deleteGame(g)}
                      disabled={deletingGameId === g.id}
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {deletingGameId === g.id ? "Removing…" : "Delete activity"}
                    </button>
                  </div>
                </div>

                {expandedGameId === g.id && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                    <form onSubmit={(e) => saveActivity(e, g)} className="flex flex-col gap-2.5 rounded-2xl bg-paper p-3">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm">Activity details</strong>
                        <span className="text-[0.65rem] text-ink-muted">Key: {g.key}</span>
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`activity-name-${g.id}`}>Activity name</label>
                        <input
                          id={`activity-name-${g.id}`}
                          className="input"
                          value={activityForm.name}
                          onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`activity-price-${g.id}`}>Base price per person (INR)</label>
                        <input
                          id={`activity-price-${g.id}`}
                          className="input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={activityForm.pricePerPerson}
                          onChange={(e) => setActivityForm({ ...activityForm, pricePerPerson: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`activity-image-${g.id}`}>Image URL</label>
                        <input
                          id={`activity-image-${g.id}`}
                          className="input"
                          type="url"
                          placeholder="https://..."
                          value={activityForm.imageUrl}
                          onChange={(e) => setActivityForm({ ...activityForm, imageUrl: e.target.value })}
                        />
                      </div>
                      {activityError && <p className="error-text">{activityError}</p>}
                      <button className="btn" type="submit" disabled={savingActivity}>
                        {savingActivity ? "Saving changes…" : "Save activity details"}
                      </button>
                    </form>

                    {g.variants.length > 0 && (
                      <table>
                        <thead>
                          <tr>
                            <th>Mode</th>
                            <th>Laps</th>
                            <th>₹ / person</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.variants.map((v) => (
                            <tr key={v.id}>
                              <td className="capitalize">{v.mode}</td>
                              <td>{v.laps}</td>
                              <td>₹{Number(v.pricePerPerson).toFixed(0)}</td>
                              <td>
                                <button
                                  className="btn btn-danger"
                                  style={{ width: "auto", minHeight: 28, padding: "2px 10px", fontSize: "0.75rem" }}
                                  onClick={() => deleteVariant(g, v.id)}
                                  disabled={deletingVariantId === v.id}
                                >
                                  {deletingVariantId === v.id ? "..." : "Remove"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <form
                      onSubmit={(e) => submitVariant(e, g)}
                      className="grid grid-cols-3 items-end gap-2"
                    >
                      <div className="field">
                        <label className="label">Mode</label>
                        <select
                          className="input"
                          value={variantForm.mode}
                          onChange={(e) => setVariantForm({ ...variantForm, mode: e.target.value })}
                          style={{ minHeight: 40, padding: "6px 8px" }}
                        >
                          <option value="single">Single</option>
                          <option value="double">Double</option>
                        </select>
                      </div>
                      <div className="field">
                        <label className="label">Laps</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          style={{ minHeight: 40, padding: "6px 8px" }}
                          value={variantForm.laps}
                          onChange={(e) => setVariantForm({ ...variantForm, laps: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="label">₹ / person</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ minHeight: 40, padding: "6px 8px" }}
                          value={variantForm.pricePerPerson}
                          onChange={(e) => setVariantForm({ ...variantForm, pricePerPerson: e.target.value })}
                        />
                      </div>
                      {variantError && (
                        <p className="error-text col-span-3">{variantError}</p>
                      )}
                      <button
                        className="btn col-span-3"
                        type="submit"
                        style={{ minHeight: 38 }}
                        disabled={savingVariant}
                      >
                        {savingVariant ? "Saving..." : "Add pricing tier"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add worker</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label className="label">UID</label>
            <input
              className="input"
              value={form.uid}
              onChange={(e) => setForm({ ...form, uid: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Assigned activity</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="">Select activity</option>
              {games.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create worker"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Workers</h3>
        <table>
          <thead>
            <tr>
              <th>UID</th>
              <th>Name</th>
              <th>Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staffList?.map((s) => (
              <tr key={s.id}>
                <td>{s.uid}</td>
                <td>{s.name}</td>
                <td>{s.role}</td>
                <td>
                  <button
                    className="btn btn-danger"
                    style={{ width: "auto", minHeight: 32, padding: "4px 10px", fontSize: "0.8rem" }}
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

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent scans</h3>
        {!scans && <p className="muted">Loading...</p>}
        {scans && scans.length === 0 && <p className="muted">No scans yet.</p>}
        {scans && scans.length > 0 && (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Scanned by</th>
                  <th>Customer</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{s.game_name}</td>
                    <td className="whitespace-nowrap">{s.scanned_by_uid || "Admin"}</td>
                    <td>
                      <div className="whitespace-nowrap">{s.customer_name}</div>
                      <div className="muted whitespace-nowrap">
                        {[s.customer_phone, s.customer_email].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{new Date(s.scanned_at).toLocaleString()}</td>
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
