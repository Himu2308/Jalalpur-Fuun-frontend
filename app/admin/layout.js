"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAdminSession, getAdminToken, setAdminSession } from "@/lib/auth";

const NAV_ITEMS = [
  {
    href: "/admin/scan",
    label: "Scan ticket",
    icon: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
  },
  {
    href: "/admin/sell",
    label: "Sell ticket",
    icon: "M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 0 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3ZM14 5v14",
  },
  {
    href: "/admin/sales",
    label: "Counter sales",
    icon: "M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6",
  },
  {
    href: "/admin/activities",
    label: "Activities",
    icon: "M4 20 10 9l4 6 2-3 4 8H4ZM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  },
  {
    href: "/admin/workers",
    label: "Workers",
    icon: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  },
  {
    href: "/admin/scans",
    label: "Scan history",
    icon: "M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4",
  },
];

function NavIcon({ d }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminLogin({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  async function login(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const data = await apiFetch("/auth/admin-login", { method: "POST", body: { password } });
      setAdminSession(data.token);
      onLoggedIn();
    } catch (err) {
      setLoginError(err.message || "Invalid password");
    } finally {
      setLoggingIn(false);
    }
  }

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

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  // null = not checked yet (avoids flashing the login form for a logged-in admin)
  const [authed, setAuthed] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getAdminToken()));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await apiFetch("/auth/admin-logout", { method: "POST", token: getAdminToken() });
    } catch (err) {
      // ignore — clear the local session either way
    }
    clearAdminSession();
    setAuthed(false);
  }

  if (authed === null) return null;
  if (!authed) return <AdminLogin onLoggedIn={() => setAuthed(true)} />;

  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.href));

  return (
    <div className="admin-shell">
      {menuOpen && (
        <button className="admin-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <span>JALALPUR FUUN</span>
          <small>ADMIN PANEL</small>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item ${current?.href === item.href ? "active" : ""}`}
            >
              <NavIcon d={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <button className="admin-nav-item admin-logout" onClick={logout}>
          <NavIcon d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
          Logout
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <NavIcon d="M4 6h16M4 12h16M4 18h16" />
          </button>
          <h1>{current?.label || "Admin"}</h1>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
