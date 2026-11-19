"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

export default function AdminScanHistoryPage() {
  const [scans, setScans] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadScans() {
    setError("");
    setRefreshing(true);
    try {
      const data = await apiFetch("/staff/scans", { token: getAdminToken() });
      setScans(data.scans);
    } catch (err) {
      setError(err.message || "Could not load scans");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadScans();
  }, []);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0">Recent scans</h3>
        <button
          className="btn btn-secondary"
          style={{ width: "auto", minHeight: 34, padding: "4px 12px", fontSize: "0.8rem" }}
          onClick={loadScans}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!scans && !error && <p className="muted">Loading...</p>}
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
  );
}
