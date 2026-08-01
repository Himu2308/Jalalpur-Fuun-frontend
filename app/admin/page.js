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

  const [expandedGameId, setExpandedGameId] = useState(null);
  const [variantForm, setVariantForm] = useState({ mode: "single", laps: "", pricePerPerson: "" });
  const [variantError, setVariantError] = useState("");
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState(null);

  const [scanResult, setScanResult] = useState(null);
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

  function toggleExpand(gameId) {
    setExpandedGameId(expandedGameId === gameId ? null : gameId);
    setVariantForm({ mode: "single", laps: "", pricePerPerson: "" });
    setVariantError("");
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
                  <button
                    className="btn btn-secondary"
                    style={{ width: "auto", minHeight: 32, padding: "4px 12px", fontSize: "0.8rem" }}
                    onClick={() => toggleExpand(g.id)}
                  >
                    {expandedGameId === g.id ? "Close" : "Manage pricing"}
                  </button>
                </div>

                {expandedGameId === g.id && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
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
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Scanned by</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>{s.game_name}</td>
                  <td>{s.staff_uid ? `${s.staff_name || s.staff_uid}` : "Admin"}</td>
                  <td>{new Date(s.scanned_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
