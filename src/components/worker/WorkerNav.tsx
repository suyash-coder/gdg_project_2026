"use client";

/**
 * WorkerNav — mobile-first bottom navigation bar.
 *
 * Fixed at the bottom of the screen.
 * Active state is determined from the current URL.
 * Logout calls POST /api/auth/logout then redirects to /login.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/jobs", label: "Jobs", icon: "📋" },
  { href: "/jobs/new", label: "Add Work", icon: "＋", highlight: true },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function WorkerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.refresh();
      router.push("/login");
    }
  }

  return (
    <nav
      style={styles.nav}
      aria-label="Worker navigation"
      id="worker-nav"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...styles.navItem,
              ...(item.highlight ? styles.highlightItem : {}),
              ...(isActive && !item.highlight ? styles.activeItem : {}),
            }}
            id={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span style={styles.icon}>{item.icon}</span>
            <span style={styles.label}>{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={styles.logoutBtn}
        id="nav-logout"
        aria-label="Sign out"
      >
        <span style={styles.icon}>⏻</span>
        <span style={styles.label}>{loggingOut ? "…" : "Out"}</span>
      </button>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "var(--nav-height)",
    background: "var(--background)",
    borderTop: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 100,
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "8px 12px",
    color: "var(--muted)",
    fontSize: "11px",
    flex: 1,
    textAlign: "center",
  },
  activeItem: {
    color: "var(--primary)",
  },
  highlightItem: {
    background: "var(--primary)",
    color: "var(--primary-fg)",
    borderRadius: "var(--radius)",
    padding: "6px 12px",
    margin: "0 4px",
    flex: "0 0 auto",
  },
  logoutBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "8px 12px",
    background: "none",
    border: "none",
    color: "var(--muted)",
    fontSize: "11px",
    cursor: "pointer",
    flex: 1,
  },
  icon: { fontSize: "18px", lineHeight: 1 },
  label: { fontSize: "10px" },
};
