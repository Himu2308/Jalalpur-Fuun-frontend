"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

export default function AdminActivitiesPage() {
  const [games, setGames] = useState(null);

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

  useEffect(() => {
    loadGames().catch((err) => setGameError(err.message || "Could not load activities"));
  }, []);

  async function loadGames() {
    const data = await apiFetch("/games");
    setGames(data.games);
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

  return (
    <div className="admin-split">
      <div className="card self-start">
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
      </div>

      <div className="card self-start">
        <h3 style={{ marginTop: 0 }}>All activities{games ? ` (${games.length})` : ""}</h3>
        {!games && <p className="muted">Loading...</p>}
        {games && games.length === 0 && <p className="muted">No activities yet.</p>}

        {games && games.length > 0 && (
          <div className="flex flex-col gap-2.5">
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
                  <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
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

                    <form onSubmit={(e) => submitVariant(e, g)} className="grid grid-cols-3 items-end gap-2">
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
                      {variantError && <p className="error-text col-span-3">{variantError}</p>}
                      <button className="btn col-span-3" type="submit" style={{ minHeight: 38 }} disabled={savingVariant}>
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
    </div>
  );
}
